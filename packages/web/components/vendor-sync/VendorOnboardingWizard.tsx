'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  DownloadSimple,
  Plugs,
} from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SegmentedPills from '@/components/ui/SegmentedPills';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  vendorCreatePayloadSchema,
  vendorNameSchema,
  vendorSlugSchema,
} from '@/lib/catalog/vendorOnboardingSchemas';

type IntegrationType = 'SCRAPER' | 'API';

type WizardCredentials = {
  scraperPath: string;
  apiBaseUrl: string;
  apiKey: string;
};

type WizardState = {
  slug: string;
  name: string;
  integrationType: IntegrationType;
  credentials: WizardCredentials;
};

type FieldErrors = Partial<Record<keyof WizardCredentials | 'slug' | 'name', string>>;

type ApiResponse = {
  ok: boolean;
  detail?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const STEPS = ['Leverandør', 'Integration', 'Legitimation', 'Review'] as const;

const INITIAL_STATE: WizardState = {
  slug: '',
  name: '',
  integrationType: 'SCRAPER',
  credentials: {
    scraperPath: '',
    apiBaseUrl: '',
    apiKey: '',
  },
};

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 rounded-2xl border border-[hsl(var(--line))] bg-white/70 px-4 py-3 text-sm shadow-sm backdrop-blur">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

function CommandCopy({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('clipboard copy failed', err);
      setCopied(false);
    }
  }, [command]);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--line))] bg-white/60 px-4 py-3 text-xs font-mono shadow-sm backdrop-blur">
      <code className="flex-1 truncate text-foreground" title={command}>
        {command}
      </code>
      <Button type="button" variant="soft" size="sm" onClick={handleCopy}>
        {copied ? 'Kopieret' : 'Kopiér'}
      </Button>
    </div>
  );
}

export default function VendorOnboardingWizard() {
  const [step, setStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [autoSlug, setAutoSlug] = useState(true);
  const [form, setForm] = useState<WizardState>(INITIAL_STATE);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { success: showSuccess, error: showError } = useToast();
  const router = useRouter();

  const integrationOptions = useMemo(
    () => [
      {
        type: 'SCRAPER' as IntegrationType,
        title: 'Scraper',
        description: 'Synkroniser via et Node.js script der læser filer eller eksterne kilder.',
        icon: <DownloadSimple size={22} weight="duotone" className="text-[hsl(var(--accent-blue))]" aria-hidden />,
      },
      {
        type: 'API' as IntegrationType,
        title: 'API',
        description: 'Konfigurer REST API integration med base URL og API nøgle.',
        icon: <Plugs size={22} weight="duotone" className="text-[hsl(var(--accent-blue))]" aria-hidden />,
      },
    ],
    [],
  );

  const pillItems = useMemo(
    () =>
      STEPS.map((label, idx) => ({
        key: String(idx),
        label,
        icon:
          idx < step
            ? (
                <CheckCircle
                  size={18}
                  weight="fill"
                  className="text-[hsl(var(--svc-check))]"
                  aria-hidden
                />
              )
            : undefined,
      })),
    [step],
  );

  const validateStep = useCallback(
    (currentStep: number): boolean => {
      const nextErrors: FieldErrors = {};

      if (currentStep === 0) {
        const slugResult = vendorSlugSchema.safeParse(form.slug);
        if (!slugResult.success) {
          nextErrors.slug = slugResult.error.issues[0]?.message ?? 'Ugyldig slug';
        }
        const nameResult = vendorNameSchema.safeParse(form.name);
        if (!nameResult.success) {
          nextErrors.name = nameResult.error.issues[0]?.message ?? 'Ugyldigt navn';
        }
      }

      if (currentStep === 2) {
        if (form.integrationType === 'SCRAPER') {
          if (!form.credentials.scraperPath.trim()) {
            nextErrors.scraperPath = 'Angiv sti til scraper scriptet';
          }
        }
        if (form.integrationType === 'API') {
          if (!form.credentials.apiBaseUrl.trim()) {
            nextErrors.apiBaseUrl = 'Angiv API base URL';
          }
          if (!form.credentials.apiKey.trim()) {
            nextErrors.apiKey = 'Angiv API nøgle';
          }
        }
      }

      setErrors(nextErrors);
      return Object.keys(nextErrors).length === 0;
    },
    [form],
  );

  const canProceed = useMemo(() => {
    if (step === 0) {
      return (
        vendorSlugSchema.safeParse(form.slug).success &&
        vendorNameSchema.safeParse(form.name).success
      );
    }
    if (step === 2) {
      if (form.integrationType === 'SCRAPER') {
        return form.credentials.scraperPath.trim().length > 0;
      }
      if (form.integrationType === 'API') {
        return (
          form.credentials.apiBaseUrl.trim().length > 0 &&
          form.credentials.apiKey.trim().length > 0
        );
      }
    }
    return true;
  }, [form, step]);

  const handleStepChange = useCallback(
    (key: string) => {
      const next = Number(key);
      if (Number.isNaN(next)) return;
      if (next <= maxVisitedStep || next <= step) {
        setStep(next);
      }
    },
    [maxVisitedStep, step],
  );

  const handleNext = () => {
    if (!validateStep(step)) return;
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    setStep(nextStep);
    setMaxVisitedStep((prev) => Math.max(prev, nextStep));
    setApiError(null);
  };

  const handlePrevious = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      setStep(2);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    const payloadResult = vendorCreatePayloadSchema.safeParse({
      slug: form.slug,
      name: form.name,
      integrationType: form.integrationType,
      credentials:
        form.integrationType === 'SCRAPER'
          ? { scraperPath: form.credentials.scraperPath.trim() }
          : {
              apiBaseUrl: form.credentials.apiBaseUrl.trim(),
              apiKey: form.credentials.apiKey.trim(),
            },
    });

    if (!payloadResult.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of payloadResult.error.issues) {
        const path = issue.path.join('.');
        const message = issue.message;
        if (!message) continue;
        if (path === 'slug' || path === 'name') {
          nextErrors[path] = message;
        }
        if (path === 'credentials.scraperPath') {
          nextErrors.scraperPath = message;
        }
        if (path === 'credentials.apiBaseUrl') {
          nextErrors.apiBaseUrl = message;
        }
        if (path === 'credentials.apiKey') {
          nextErrors.apiKey = message;
        }
      }
      setErrors(nextErrors);
      setSubmitting(false);
      setStep((prev) => (prev === 3 ? 3 : 2));
      return;
    }

    try {
      const res = await fetch('/api/catalog/vendor-sync/vendors', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadResult.data),
      });

      let json: ApiResponse | null = null;
      try {
        json = (await res.json()) as ApiResponse;
      } catch {
        json = null;
      }

      if (!res.ok || !json?.ok) {
        if (json?.fieldErrors) {
          const next: FieldErrors = {};
          for (const [field, messages] of Object.entries(json.fieldErrors)) {
            const message = messages?.[0];
            if (!message) continue;
            if (field === 'slug' || field === 'name') {
              next[field] = message;
            }
            if (field === 'credentials.scraperPath') {
              next.scraperPath = message;
            }
            if (field === 'credentials.apiBaseUrl') {
              next.apiBaseUrl = message;
            }
            if (field === 'credentials.apiKey') {
              next.apiKey = message;
            }
          }
          setErrors(next);
        }
        const detail = json?.detail || json?.error || res.statusText || 'Kunne ikke oprette leverandør';
        setApiError(detail);
        showError('Oprettelse mislykkedes', { description: detail });
        setSubmitting(false);
        return;
      }

      showSuccess('Leverandør oprettet', {
        description: `/${payloadResult.data.slug} er klar til synk`,
      });
      router.push('/vendor-sync/vendors');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ukendt fejl';
      setApiError(message);
      showError('Oprettelse mislykkedes', { description: message });
      setSubmitting(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const normalized = normalizeSlug(value);
    setForm((prev) => ({ ...prev, slug: normalized }));
    setErrors((prev) => ({ ...prev, slug: undefined }));
    setAutoSlug(normalized.length === 0);
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => {
      const shouldSyncSlug = autoSlug || prev.slug.length === 0;
      const normalizedSlug = shouldSyncSlug ? normalizeSlug(value) : prev.slug;
      return {
        ...prev,
        name: value,
        slug: normalizedSlug,
      };
    });
    setErrors((prev) => ({ ...prev, name: undefined, slug: undefined }));
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="vendor-slug">Slug</Label>
            <Input
              id="vendor-slug"
              value={form.slug}
              onChange={(event) => handleSlugChange(event.target.value)}
              placeholder="f.eks. moscot"
              className="tahoe-input h-11 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
            />
            {errors.slug ? <p className="text-sm text-destructive">{errors.slug}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vendor-name">Navn</Label>
            <Input
              id="vendor-name"
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Leverandørnavn"
              className="tahoe-input h-11 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
          </div>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {integrationOptions.map((option) => {
            const active = form.integrationType === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  setForm((prev) => ({
                    ...prev,
                    integrationType: option.type,
                    credentials: {
                      ...prev.credentials,
                    },
                  }));
                  setErrors({});
                  setMaxVisitedStep((prev) => Math.max(prev, 1));
                }}
                className={cn(
                  'flex h-full flex-col items-start gap-3 rounded-2xl border px-5 py-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-blue))] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active
                    ? 'border-[hsl(var(--accent-blue))]/60 bg-[hsl(var(--accent-blue))/0.08] text-foreground'
                    : 'border-[hsl(var(--line))] bg-white/60 text-muted-foreground hover:-translate-y-[1px] hover:shadow-md',
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {option.icon}
                  {option.title}
                  {active ? <Badge variant="ok">Valgt</Badge> : null}
                </span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          {form.integrationType === 'SCRAPER' ? (
            <div className="space-y-2">
              <Label htmlFor="vendor-scraper-path">Scraper sti</Label>
              <Input
                id="vendor-scraper-path"
                value={form.credentials.scraperPath}
                onChange={(event) => {
                  const value = event.target.value;
                  setForm((prev) => ({
                    ...prev,
                    credentials: { ...prev.credentials, scraperPath: value },
                  }));
                  setErrors((prev) => ({ ...prev, scraperPath: undefined }));
                }}
                placeholder="s3://bucket/katalog.json"
                className="tahoe-input h-11 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
              />
              {errors.scraperPath ? (
                <p className="text-sm text-destructive">{errors.scraperPath}</p>
              ) : null}
            </div>
          ) : null}

          {form.integrationType === 'API' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vendor-api-base">API base URL</Label>
                <Input
                  id="vendor-api-base"
                  value={form.credentials.apiBaseUrl}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      credentials: { ...prev.credentials, apiBaseUrl: value },
                    }));
                    setErrors((prev) => ({ ...prev, apiBaseUrl: undefined }));
                  }}
                  placeholder="https://api.vendor.test/catalog"
                  className="tahoe-input h-11 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
                />
                {errors.apiBaseUrl ? (
                  <p className="text-sm text-destructive">{errors.apiBaseUrl}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor-api-key">API nøgle</Label>
                <Input
                  id="vendor-api-key"
                  value={form.credentials.apiKey}
                  onChange={(event) => {
                    const value = event.target.value;
                    setForm((prev) => ({
                      ...prev,
                      credentials: { ...prev.credentials, apiKey: value },
                    }));
                    setErrors((prev) => ({ ...prev, apiKey: undefined }));
                  }}
                  placeholder="••••••••"
                  className="tahoe-input h-11 rounded-2xl border-[hsl(var(--line))] bg-white/70 px-4 text-sm"
                />
                {errors.apiKey ? <p className="text-sm text-destructive">{errors.apiKey}</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    const slug = form.slug || '—';
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Gennemgå og bekræft</h3>
          <p className="text-sm text-muted-foreground">
            Bekræft at oplysningerne nedenfor er korrekte, inden du opretter leverandøren.
          </p>
        </div>

        <div className="grid gap-3">
          <ReviewRow label="Slug" value={slug} />
          <ReviewRow label="Navn" value={form.name || '—'} />
          <ReviewRow
            label="Integration"
            value={form.integrationType === 'SCRAPER' ? 'Scraper' : 'API'}
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">SDK kommandoer</p>
          <CommandCopy command={`pnpm tsx scripts/vendors/new-adapter.ts ${slug}`} />
          <CommandCopy command={`pnpm tsx scripts/vendors/validate-adapter.ts ${slug}`} />
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/vendor-sync/vendors" className="inline-flex items-center gap-2">
            <ArrowLeft size={18} weight="bold" aria-hidden />
            Tilbage til oversigten
          </Link>
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-foreground">Onboard ny leverandør</h1>
        <p className="text-sm text-muted-foreground">
          Følg de fire trin for at oprette en leverandør og gøre integrationen klar til vendor sync.
        </p>
      </div>

      <SegmentedPills
        items={pillItems}
        value={String(step)}
        onChange={handleStepChange}
        className="w-full max-w-3xl"
      />

      <div className="space-y-4 rounded-3xl border border-[hsl(var(--line))] bg-white/70 p-6 shadow-md backdrop-blur">
        {apiError ? (
          <div className="rounded-2xl border border-[hsl(var(--svc-repair))]/40 bg-[hsl(var(--svc-repair))/0.08] px-4 py-3 text-sm text-[hsl(var(--svc-repair))]">
            {apiError}
          </div>
        ) : null}
        {renderStep()}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="muted">Trin {step + 1} af {STEPS.length}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="soft"
            size="pill"
            onClick={() => router.push('/vendor-sync/vendors')}
            disabled={submitting}
          >
            Annuller
          </Button>
          {step > 0 ? (
            <Button
              type="button"
              variant="soft"
              size="pill"
              onClick={handlePrevious}
              disabled={submitting}
            >
              Forrige
            </Button>
          ) : null}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="tahoe"
              size="pill"
              onClick={handleNext}
              disabled={!canProceed || submitting}
            >
              Næste trin
            </Button>
          ) : (
            <Button
              type="button"
              variant="tahoe"
              size="pill"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Opretter…' : 'Opret leverandør'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
