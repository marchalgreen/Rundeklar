import { hash } from '@node-rs/argon2';

export type Store = {
  id: string;
  email: string;
  passHash: string;
  totpSecret: string;
};
export type Employee = {
  id: string;
  storeId: string;
  slug: string;
  name: string;
  pinHash: string;
};

let _booted = false;
let _stores: Store[] = [];
let _emps: Employee[] = [];

export async function bootMock() {
  if (_booted) return;
  _booted = true;

  const passHash = await hash('store-demo-password');
  const pin1111 = await hash('1111');

  _stores = [
    {
      id: 'store-1',
      email: 'owner@clairity.demo',
      passHash,
      // NOTE: example TOTP secret; use one per real user
      totpSecret: 'KVKFKRCPNZQUYMLX',
    },
  ];

  _emps = [
    {
      id: 'e1',
      storeId: 'store-1',
      slug: 'soren-nichlas-frid',
      name: 'Søren Nichlas Frid',
      pinHash: pin1111,
    },
    { id: 'e2', storeId: 'store-1', slug: 'lars-madsen', name: 'Lars Madsen', pinHash: pin1111 },
    {
      id: 'e3',
      storeId: 'store-1',
      slug: 'dorthea-norgaard',
      name: 'Dorthea Nørgaard',
      pinHash: pin1111,
    },
    {
      id: 'e4',
      storeId: 'store-1',
      slug: 'michelle-fridahl',
      name: 'Michelle Fridahl',
      pinHash: pin1111,
    },
    {
      id: 'e5',
      storeId: 'store-1',
      slug: 'rasmus-frid-norgaard',
      name: 'Rasmus Frid Nørgaard',
      pinHash: pin1111,
    },
    {
      id: 'e6',
      storeId: 'store-1',
      slug: 'mette-sorensen',
      name: 'Mette Sørensen',
      pinHash: pin1111,
    },
  ];
}

export const db = {
  stores: () => _stores,
  storeByEmail: (email: string) => _stores.find((s) => s.email === email),
  storeById: (id: string) => _stores.find((s) => s.id === id),
  empsByStore: (storeId: string) => _emps.filter((e) => e.storeId === storeId),
  empBySlug: (storeId: string, slug: string) =>
    _emps.find((e) => e.storeId === storeId && e.slug === slug),
};
