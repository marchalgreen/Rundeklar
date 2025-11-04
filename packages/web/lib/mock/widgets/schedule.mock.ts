// src/lib/mock/widgets/schedule.mock.ts
// Matches SERVICE_META keys: 'eyeexam' | 'lenses' | 'check' | 'glasses' | 'repair' | 'pickup' | 'other'

export type ServiceType =
  | 'eyeexam'
  | 'lenses'
  | 'check'
  | 'glasses'
  | 'repair'
  | 'pickup'
  | 'other';

export type ScheduleMockItem = {
  time: string; // "HH:MM"
  name: string; // customer/patient name or label
  type?: ServiceType; // service key (not label)
  blocked?: boolean; // true for breaks/blocked time
  active?: boolean; // optional: current item highlight
};

export const MOCK_SCHEDULE: ScheduleMockItem[] = [
  { time: '09:00', name: 'Lone Andersen', type: 'check' }, // Kontrol
  { time: '09:45', name: 'Martin Rasmussen', type: 'eyeexam' }, // Synsprøve
  { time: '10:35', name: 'Camilla Madsen', type: 'eyeexam', active: true }, // Synsprøve
  { time: '11:15', name: 'Peter Poulsen', type: 'glasses' }, // Brillejustering → Briller
  { time: '12:00', name: '— Pause —', blocked: true }, // no chip
  { time: '13:00', name: 'Henrik Sørensen', type: 'eyeexam' }, // Synsprøve
  { time: '14:30', name: 'Hanne Riis', type: 'lenses' }, // Kontaktlinse kontrol → Linser
  { time: '15:15', name: 'Mathilde Jørgensen', type: 'check' }, // Efterkontrol → Kontrol
  { time: '16:00', name: 'Carsten Holm', type: 'eyeexam' }, // Synsprøve
];
