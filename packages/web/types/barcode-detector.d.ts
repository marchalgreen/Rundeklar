// Minimal ambient types for the BarcodeDetector API
// (Chromium ships it; Safari may not — we gate at runtime.)
interface BarcodeDetectorOptions {
  formats?: string[];
}

interface DetectedBarcode {
  rawValue?: string;
  format?: string;
  cornerPoints?: Array<{ x: number; y: number }>;
  boundingBox?: DOMRectReadOnly;
}

interface BarcodeDetector {
  detect(
    source: HTMLVideoElement | HTMLCanvasElement | ImageBitmap | ImageData,
  ): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: {
    new (options?: BarcodeDetectorOptions): BarcodeDetector;
  };
}
