// src/components/windows/SynsJournal/types.ts

export type CustomerId = string & { __brand: 'CustomerId' };
export type StaffId = string & { __brand: 'StaffId' };

export type Eye = 'OD' | 'OS';
export type EyeKey = Eye | 'OU';
export type RxFieldKey = 'sph' | 'cyl' | 'axis' | 'prism' | 'base' | 'add' | 'va' | 'pd';

export type RxCellValue = string | null | undefined;

export interface RxRow {
  sph?: RxCellValue;
  cyl?: RxCellValue;
  axis?: RxCellValue;
  axe?: RxCellValue;
  prism?: RxCellValue;
  base?: RxCellValue;
  add?: RxCellValue;
  va?: RxCellValue;
  pd?: RxCellValue;
  notes?: RxCellValue;
  [key: string]: RxCellValue;
}

export type RxTable = Record<Eye, RxRow>;
export type RxTriplet = Record<EyeKey, RxRow>;

export interface DialogRow {
  id: string;
  label?: string;
  value: string | number | boolean | null;
  note?: string | null;
  [key: string]: unknown;
}

export interface AnamneseState {
  reason?: string;
  symptoms?: string;
  medical?: string;
  meds?: string;
  familyHx?: string;
  work?: string;
  notes?: string | null;
  [key: string]: unknown;
}

export interface AccommodationState {
  pra?: string;
  nra?: string;
  amp?: string;
  [key: string]: string | undefined;
}

export interface StereoState {
  near?: string;
  far?: string;
  color?: string;
  dominantEye?: Eye | '';
  [key: string]: string | undefined;
}

export interface SynsproveState {
  previousRx: RxTriplet;
  autorefractor: RxTriplet;
  retinoscopyDist: RxTriplet;
  retinoscopyNear: RxTriplet;
  subjBest: RxTriplet;

  foriDistance?: string;
  foriNear?: string;
  verticalForiFar?: string;
  verticalForiNear?: string;
  crossCylNear_OD?: string;
  crossCylNear_OS?: string;
  crossCylLag_OD?: string;
  crossCylLag_OS?: string;

  accommodation: AccommodationState;
  positiveRelAcc?: string;
  negativeRelAcc?: string;
  fixationDisparity?: string;

  stereo: StereoState;

  pdDistance?: string;
  pdNear?: string;

  conclusionDistance: RxTriplet;
  conclusionNear: RxTriplet;
  conclusionTask: RxTriplet;
  conclusionSports: RxTriplet;

  notes?: string;
  [key: string]: unknown;
}

export type TwentyOneValue = string | null;
export interface TwentyOneState {
  [key: string]: TwentyOneValue;
}

export interface JournalState {
  anamnese: AnamneseState;
  synsprove: SynsproveState;
  twentyOne: TwentyOneState;
  [key: string]: unknown;
}
