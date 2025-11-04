export const MoscotRawSample = {
  catalogId: 'LEMTOSH-BLACK',
  brand: 'MOSCOT',
  model: 'LEMTOSH',
  name: 'LEMTOSH BLACK',
  category: 'Frames',
  collections: ['Core'],
  tags: ['Icon', 'Acetate'],
  storyHtml: '<p>Classic MOSCOT design.</p>',
  photos: [
    {
      url: 'https://example.test/images/lem-tosh-front.jpg',
      label: 'Front view',
      isHero: true,
      angle: 'front',
      source: 'catalog',
    },
    {
      url: 'https://example.test/images/lem-tosh-side.jpg',
      label: 'Side view',
      angle: 'side',
    },
  ],
  source: {
    supplier: 'MOSCOT',
    url: 'https://moscot.com/products/lem-tosh',
    lastSyncISO: '2024-01-01T00:00:00.000Z',
    confidence: 'verified',
  },
  price: {
    amount: 295,
    currency: 'USD',
  },
  variants: [
    {
      id: 'LEMTOSH-46-BLK',
      sku: 'LEMTOSH-46-BLK',
      sizeLabel: '46-24-145',
      fit: 'average',
      usage: 'optical',
      color: { name: 'Black', finish: 'gloss' },
      measurements: {
        lensWidth: 46,
        bridge: 24,
        temple: 145,
      },
      clipCompatible: true,
      barcode: '1234567890123',
    },
    {
      id: 'LEMTOSH-49-BLK',
      sku: 'LEMTOSH-49-BLK',
      sizeLabel: '49-24-145',
      fit: 'wide',
      usage: 'optical',
      color: { name: 'Black', finish: 'gloss' },
      measurements: {
        lensWidth: 49,
        bridge: 24,
        temple: 145,
      },
      clipCompatible: true,
    },
  ],
} as const;

export const MoscotAccessorySample = {
  catalogId: 'CLEANING-CLOTH',
  brand: 'MOSCOT',
  name: 'Cleaning Cloth',
  category: 'Accessories',
  tags: ['Care'],
  photos: [
    {
      url: 'https://example.test/images/cloth.jpg',
    },
  ],
  source: {
    supplier: 'MOSCOT',
    url: 'https://moscot.com/products/cloth',
    lastSyncISO: '2024-01-01T00:00:00.000Z',
  },
  variants: [
    {
      id: 'CLEANING-CLOTH-ONE',
      sku: 'CLEANING-CLOTH-ONE',
      sizeLabel: 'One Size',
      packSize: 3,
      color: { name: 'Yellow' },
    },
  ],
} as const;
