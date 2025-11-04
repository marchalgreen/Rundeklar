// src/lib/search/kundekortSearch.ts
// Lightweight, diacritics-insensitive search with category grouping.
// No dependencies. Designed for live/typeahead usage.

import { customers, Customer, fullName, fullAddress } from '@/lib/mock/customers';

export type SearchCategory =
  | 'Navne'
  | 'Adresse'
  | 'By'
  | 'Email'
  | 'Telefon'
  | 'Kundenummer'
  | 'Tags';

export type SearchHit = {
  id: string; // customer id
  label: string; // primary text to display
  sub?: string; // secondary text (muted)
  category: SearchCategory;
  score: number; // lower is better
  field: string; // which field matched
};

export type SearchGrouped = {
  query: string;
  groups: { category: SearchCategory; items: SearchHit[] }[];
  flat: SearchHit[]; // flattened for keyboard nav
};

const norm = (s: string) =>
  (s || '')
    .toLocaleLowerCase()
    // strip diacritics
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

const tokenize = (s: string) =>
  norm(s)
    .split(/[\s,.-/_]+/g)
    .filter(Boolean);

function scoreContains(hay: string, q: string) {
  // exact prefix beat substring; shorter distance better
  const i = hay.indexOf(q);
  if (i < 0) return Infinity;
  return i === 0 ? 0 : 2 + i; // simple heuristic scoring
}

export function kundekortSearch(rawQuery: string, limitPerGroup = 6): SearchGrouped {
  const query = norm(rawQuery.trim());
  const qTokens = tokenize(query);

  if (!query) return { query, groups: [], flat: [] };

  const hits: Record<SearchCategory, SearchHit[]> = {
    Navne: [],
    Adresse: [],
    By: [],
    Email: [],
    Telefon: [],
    Kundenummer: [],
    Tags: [],
  };

  const add = (cat: SearchCategory, item: SearchHit) => {
    hits[cat].push(item);
  };

  for (const c of customers) {
    const name = norm(fullName(c));
    const addr = norm(c.address.street);
    const city = norm(c.address.city);
    const email = norm(c.email || '');
    const tel = norm([c.phoneMobile, c.phoneWork].filter(Boolean).join(' '));
    const tags = (c.tags || []).map(norm);

    // name
    const sName = scoreContains(name, query);
    if (sName !== Infinity) {
      add('Navne', {
        id: c.id,
        label: fullName(c),
        sub: fullAddress(c),
        category: 'Navne',
        score: sName,
        field: 'name',
      });
    }

    // street
    const sStreet = scoreContains(addr, query);
    if (sStreet !== Infinity) {
      add('Adresse', {
        id: c.id,
        label: c.address.street,
        sub: fullName(c),
        category: 'Adresse',
        score: sStreet,
        field: 'street',
      });
    }

    // city
    const sCity = scoreContains(city, query);
    if (sCity !== Infinity) {
      add('By', {
        id: c.id,
        label: c.address.city,
        sub: fullName(c),
        category: 'By',
        score: sCity,
        field: 'city',
      });
    }

    // email
    if (email) {
      const sEmail = scoreContains(email, query);
      if (sEmail !== Infinity) {
        add('Email', {
          id: c.id,
          label: c.email!,
          sub: fullName(c),
          category: 'Email',
          score: sEmail,
          field: 'email',
        });
      }
    }

    // phone
    if (tel) {
      const sTel = scoreContains(tel.replace(/\s+/g, ''), query.replace(/\s+/g, ''));
      if (sTel !== Infinity) {
        add('Telefon', {
          id: c.id,
          label: c.phoneMobile || c.phoneWork || '',
          sub: fullName(c),
          category: 'Telefon',
          score: sTel,
          field: 'phone',
        });
      }
    }

    // kundenummer
    if (c.customerNo != null) {
      const sNo = scoreContains(String(c.customerNo), query);
      if (sNo !== Infinity) {
        add('Kundenummer', {
          id: c.id,
          label: String(c.customerNo),
          sub: fullName(c),
          category: 'Kundenummer',
          score: sNo,
          field: 'customerNo',
        });
      }
    }

    // tags
    if (tags.length) {
      for (const t of tags) {
        const sTag = scoreContains(t, query);
        if (sTag !== Infinity) {
          add('Tags', {
            id: c.id,
            label: (c.tags || []).join(', '),
            sub: fullName(c),
            category: 'Tags',
            score: sTag,
            field: 'tags',
          });
          break;
        }
      }
    }

    // token match fallback (e.g., "Mads 4000")
    if (qTokens.length > 1) {
      const hay = [
        name,
        addr,
        city,
        email,
        tel,
        String(c.customerNo || ''),
        ...(c.tags || []).map(norm),
      ].join(' ');
      const every = qTokens.every((qt) => hay.includes(qt));
      if (every) {
        // Put into Names as a bonus result with worse score so it won’t outrank direct matches
        add('Navne', {
          id: c.id,
          label: fullName(c),
          sub: fullAddress(c),
          category: 'Navne',
          score: 99,
          field: 'multi',
        });
      }
    }
  }

  // Sort inside categories and trim
  const groupsOrdered: SearchCategory[] = [
    'Navne',
    'Adresse',
    'By',
    'Email',
    'Telefon',
    'Kundenummer',
    'Tags',
  ];
  const groups = groupsOrdered
    .map((cat) => ({
      category: cat,
      items: hits[cat]
        .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label, 'da'))
        .slice(0, limitPerGroup),
    }))
    .filter((g) => g.items.length > 0);

  const flat = groups.flatMap((g) => g.items);
  return { query: rawQuery, groups, flat };
}

// helper to fetch by id
export function getCustomerById(id: string): Customer | undefined {
  return customers.find((c) => c.id === id);
}
