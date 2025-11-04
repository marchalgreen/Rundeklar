// src/app/api/dawa/route.ts
// Next.js (App Router) API that validates/normalizes Danish addresses via DAWA.
// POST { text?: string, skeleton?: { streetRaw, postnr, cityRaw } }

import { NextRequest, NextResponse } from 'next/server';
import {
  CanonicalAddress,
  generateVariants,
  parseSkeleton,
  streetSimilarity,
} from '@/lib/ocr/address';

type DawaAutocompleteHit = {
  tekst: string;
  adresse: {
    id: string;
    vejnavn: string;
    husnr: string;
    etage?: string;
    doer?: string;
    postnr: string;
    postnrnavn: string;
    supplerendebynavn?: string;
  };
};

const BEST_THRESHOLD = 85;

async function fetchWithTimeout(url: string, ms: number) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function scoreCandidate(
  wanted: { street: string; postnr: string; city: string },
  hit: DawaAutocompleteHit,
) {
  const a = hit.adresse;
  let score = 0;
  if (a.postnr === wanted.postnr) score += 60;
  const cityHit = (a.postnrnavn || '').toLowerCase();
  if (cityHit === wanted.city.toLowerCase()) score += 20;
  const sim = streetSimilarity(`${a.vejnavn} ${a.husnr}`, wanted.street);
  score += 1.5 * (sim * 100); // up to +150
  return score;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}) as any);
    const text: string | undefined = body?.text;
    const skeleton = body?.skeleton;

    let skel =
      (skeleton &&
        typeof skeleton.streetRaw === 'string' &&
        typeof skeleton.postnr === 'string' &&
        typeof skeleton.cityRaw === 'string' &&
        (skeleton as any)) ||
      (text && parseSkeleton(text)) ||
      null;

    if (!skel) {
      return NextResponse.json(
        { ok: false, error: 'Could not parse address skeleton from input.' },
        { status: 400 },
      );
    }

    const { postnr, city, streets } = generateVariants(skel);
    // Build queries
    const queries = streets.slice(0, 30).map((street) => ({
      street,
      postnr,
      city,
      q: `${street}, ${postnr} ${city}`,
    }));

    // Call DAWA in small batches (avoid rate spikes)
    const allHits: Array<{ score: number; hit: DawaAutocompleteHit; forQ: string }> = [];
    const baseUrl = 'https://api.dataforsyningen.dk/autocomplete?q=';

    for (let i = 0; i < queries.length; i += 6) {
      const batch = queries.slice(i, i + 6);
      const resps = await Promise.allSettled(
        batch.map((q) =>
          fetchWithTimeout(
            `${baseUrl}${encodeURIComponent(q.q)}&type=adresse&fuzzy=1&per_side=5`,
            2200,
          ),
        ),
      );

      for (let j = 0; j < resps.length; j++) {
        const r = resps[j];
        if (r.status === 'fulfilled' && r.value.ok) {
          const json = (await r.value.json()) as DawaAutocompleteHit[];
          json?.forEach((hit) => {
            const score = scoreCandidate({ street: batch[j]!.street, postnr, city }, hit);
            allHits.push({ score, hit, forQ: batch[j]!.q });
          });
        }
      }
    }

    if (!allHits.length) {
      return NextResponse.json({ ok: false, candidates: [] }, { status: 200 });
    }

    allHits.sort((a, b) => b.score - a.score);
    const top = allHits[0]!;
    const canonical: CanonicalAddress = {
      street: `${top.hit.adresse.vejnavn} ${top.hit.adresse.husnr}`,
      postalCode: top.hit.adresse.postnr,
      city: top.hit.adresse.postnrnavn,
      country: 'Danmark',
      dawaId: top.hit.adresse.id,
    };

    const resp = {
      ok: top.score >= BEST_THRESHOLD,
      score: Math.round(top.score),
      address: canonical,
      alternatives: allHits.slice(1, 3).map((x) => ({
        score: Math.round(x.score),
        address: {
          street: `${x.hit.adresse.vejnavn} ${x.hit.adresse.husnr}`,
          postalCode: x.hit.adresse.postnr,
          city: x.hit.adresse.postnrnavn,
          country: 'Danmark',
          dawaId: x.hit.adresse.id,
        } as CanonicalAddress,
      })),
    };

    // Short TTL (API is fast), allow CDN caching if you want
    return NextResponse.json(resp, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Unexpected server error.' }, { status: 500 });
  }
}
