'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/cn';
import { hueFromString } from '@/lib/utils/customerAccent';
import type { Customer } from '@/lib/mock/customers';

import { FloppyDisk, Notebook, EyedropperSample, Package } from '@phosphor-icons/react';

import SegmentedPills from '@/components/ui/SegmentedPills';
import AnamneseView from './AnamneseView';
import SynsproveView, { type RxTriplet, emptyTriplet } from './SynsproveView';
import TwentyOneView from './TwentyOneView';
import type {
  AnamneseState,
  Eye,
  EyeKey,
  JournalState,
  RxFieldKey,
  SynsproveState,
  TwentyOneState,
} from './types';

// ---------- Types ----------
export type DialogResponse = 'ja' | 'nej' | 'ved_ikke' | '';
export type DialogQuestionId =
  | 'blur_far'
  | 'blur_near'
  | 'periodic_blur'
  | 'accommodation'
  | 'reading'
  | 'light'
  | 'double'
  | 'headache'
  | 'fatigue'
  | 'redness'
  | 'medical_state'
  | 'family';

type DialogNoteKey = `${DialogQuestionId}_note`;
type DialogFieldMap = {
  [K in DialogQuestionId]?: DialogResponse;
} & {
  [K in DialogNoteKey]?: string;
};

type OldRxColumnKey = 'sph' | 'cyl' | 'axe' | 'prism' | 'base' | 'add' | 'va';
type OldRxEye = 'OD' | 'OS';
type OldRxFieldKey = `oldRx_${OldRxEye}_${OldRxColumnKey}`;

export type OldRxFormValue = {
  oldRx_source?: string;
  oldRx_vaURx?: string;
  oldRx_pdFar?: string;
  oldRx_pdNear?: string;
  oldRx_bin?: string;
  oldRx_OD_habFar?: string;
  oldRx_OS_habFar?: string;
  oldRx_OD_habNear?: string;
  oldRx_OS_habNear?: string;
  oldRx_vaBinFar?: string;
  oldRx_vaBinNear?: string;
  oldRx_notes?: string;
} & Partial<Record<OldRxFieldKey, string>>;

type AnamneseExtra = {
  medical?: string;
  meds?: string;
  familyHx?: string;
  work?: string;
};

export type Anamnese = Partial<AnamneseState> & AnamneseExtra & OldRxFormValue & DialogFieldMap;

export type CoverTest = { distance?: string; near?: string; npc?: string; recovery?: string };
export type Accommodation = { pra?: string; nra?: string; amp?: string };
export type Stereo = { near?: string; far?: string; color?: string; dominantEye?: Eye | '' };

export type Synsprove = SynsproveState;

export type TwentyOnePoints = TwentyOneState;

type JournalBase = Omit<JournalState, 'anamnese' | 'synsprove' | 'twentyOne'>;

export type Journal = JournalBase & {
  anamnese: Anamnese;
  synsprove: Synsprove;
  twentyOne: TwentyOnePoints;
};

type Props = { payload?: { customer?: Customer } };
type Tab = 'an' | 'sp' | 't21';

function pxJoin(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

type CustHueStyle = React.CSSProperties & Record<'--cust-hue', number>;

export default function SynsJournal({ payload }: Props) {
  const customer = payload?.customer;
  const hue = useMemo(
    () => hueFromString(`${customer?.id || customer?.customerNo || customer?.email || 'x'}`),
    [customer]
  );
  const rootStyle: CustHueStyle = { '--cust-hue': hue };

  const [tab, setTab] = useState<Tab>('an');
  const [dirty, setDirty] = useState(false);

  const [data, setData] = useState<Journal>(() => ({
    anamnese: {},
    synsprove: {
      previousRx: emptyTriplet(),
      autorefractor: emptyTriplet(),
      retinoscopyDist: emptyTriplet(),
      retinoscopyNear: emptyTriplet(),
      subjBest: emptyTriplet(),
      conclusionDistance: emptyTriplet(),
      conclusionNear: emptyTriplet(),
      conclusionTask: emptyTriplet(),
      conclusionSports: emptyTriplet(),
      accommodation: {},
      stereo: {},
    },
    twentyOne: {},
  }));

  const touch =
    <T extends object>(path: (d: Journal) => T, write: (d: Journal, v: T) => void) =>
    (v: T) =>
      setData((prev) => {
        const next = structuredClone(prev) as Journal;
        write(next, v);
        setDirty(true);
        return next;
      });

  const setRx = (section: keyof Synsprove, eye: EyeKey, field: RxFieldKey, value: string) =>
    setData((prev) => {
      const next = structuredClone(prev) as Journal;
      (next.synsprove[section] as RxTriplet)[eye][field] = value;
      setDirty(true);
      return next;
    });

  const save = () => {
    console.log('SAVE syns-journal', data);
    setDirty(false);
    toast.success('Journal gemt');
  };

  return (
    <div className="space-y-4" style={rootStyle}>
      {/* Header */}
      <div
        className="rounded-xl border border-border card-surface p-3"
        style={{ boxShadow: `inset 0 3px 0 hsl(${hue} 90% 88% / .45)` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold truncate">
              Syns-/journal {customer ? `— ${customer.firstName} ${customer.lastName}` : ''}
            </div>
            <div className="text-xs text-foreground/65">
              {customer?.customerNo ? `#${customer.customerNo}` : ''}{' '}
              {customer?.address?.postalCode ? '•' : ''}{' '}
              {pxJoin(customer?.address?.postalCode, customer?.address?.city)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className={cn('chip gap-2', !dirty && 'opacity-80')}
              style={
                dirty
                  ? {
                      background: `linear-gradient(to bottom, hsl(${hue} 95% 94% / .98), hsl(${hue} 90% 90% / .98))`,
                      borderColor: `hsl(${hue} 55% 55% / .55)`,
                      boxShadow: `0 0 0 1px hsl(${hue} 60% 60% / .35),
                         0 8px 18px hsl(${hue} 60% 40% / .18),
                         inset 0 1px 0 #fff`,
                    }
                  : undefined
              }
              disabled={!dirty}
              onClick={save}
              title={dirty ? 'Gem (⌘/Ctrl+S)' : 'Ingen ændringer'}
            >
              <FloppyDisk size={16} weight="bold" />
              Gem
            </Button>
          </div>
        </div>

        {/* Segmented tabs (generic component) */}
        <div className="mt-2">
          <SegmentedPills
            items={[
              { key: 'an', label: '1. Anamnese', icon: <Notebook size={14} weight="bold" /> },
              {
                key: 'sp',
                label: '2. Synsprøve',
                icon: <EyedropperSample size={14} weight="bold" />,
              },
              { key: 't21', label: '3. 21-punkts', icon: <Package size={14} weight="bold" /> },
            ]}
            value={tab}
            onChange={(k) => setTab(k as Tab)}
            hue={hue}
            size="sm"
            ariaLabel="Syns-/journal sektioner"
          />
        </div>
      </div>

      {/* Body */}
      {tab === 'an' && (
        <AnamneseView
          value={data.anamnese}
          onChange={touch(
            (d) => d.anamnese,
            (d, v) => (d.anamnese = v)
          )}
          hue={hue}
        />
      )}

      {tab === 'sp' && (
        <SynsproveView
          value={data.synsprove}
          onChange={touch(
            (d) => d.synsprove,
            (d, v) => (d.synsprove = v)
          )}
          setRx={setRx}
          hue={hue}
          twentyOne={data.twentyOne}
          onTwentyOneChange={touch(
            (d) => d.twentyOne,
            (d, v) => (d.twentyOne = v)
          )}
        />
      )}

      {tab === 't21' && (
        <TwentyOneView
          value={data.twentyOne}
          onChange={touch(
            (d) => d.twentyOne,
            (d, v) => (d.twentyOne = v)
          )}
          hue={hue}
        />
      )}
    </div>
  );
}
