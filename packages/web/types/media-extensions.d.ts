// Non-standard / experimental media constraints we probe at runtime.
interface MediaTrackCapabilities {
  torch?: boolean;
  zoom?: number | { min?: number; max?: number };
  focusMode?: string[];
  exposureMode?: string[];
}

interface MediaTrackSettings {
  torch?: boolean;
  zoom?: number;
  focusMode?: string;
  exposureMode?: string;
}
