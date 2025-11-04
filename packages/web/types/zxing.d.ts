// src/types/zxing.d.ts
// -----------------------------------------------------------------------------
// Minimal type shim for @zxing/library
// -----------------------------------------------------------------------------
// The @zxing/browser package bundles @zxing/library at runtime, but does not
// re-export all of its type declarations. This shim allows TypeScript to compile
// cleanly when we import symbols like `BarcodeFormat` or `DecodeHintType`.
//
// No runtime code — only type placeholders.

declare module '@zxing/library' {
  // Base types
  export enum BarcodeFormat {
    QR_CODE = 0,
    DATA_MATRIX = 1,
    AZTEC = 2,
    PDF_417 = 3,
    EAN_13 = 4,
    EAN_8 = 5,
    CODE_128 = 6,
    CODE_39 = 7,
    ITF = 8,
    UPC_A = 9,
    UPC_E = 10,
    CODABAR = 11,
    RSS_14 = 12,
    RSS_EXPANDED = 13,
    MAXICODE = 14,
  }

  export enum DecodeHintType {
    POSSIBLE_FORMATS = 1,
    CHARACTER_SET = 2,
    TRY_HARDER = 3,
  }

  export class NotFoundException extends Error {}

  // Generic base classes (no-op for type safety)
  export class MultiFormatReader {
    setHints(hints: Map<DecodeHintType, unknown>): void;
  }

  export class Result {
    getText(): string;
  }
}
