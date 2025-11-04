export type TelemetryEventLevel = 'debug' | 'info' | 'warn' | 'error';

export type TelemetryEventPayload = Record<string, unknown>;

export type TelemetryEvent = {
  name: string;
  level?: TelemetryEventLevel;
  timestamp?: string;
  properties?: TelemetryEventPayload;
  context?: TelemetryEventPayload;
};

export interface TelemetryEmitter {
  emit(event: TelemetryEvent): void | Promise<void>;
}

export type ConsoleTelemetryOptions = {
  /**
   * Allows silencing console output while keeping the emitter hookable.
   * Defaults to true unless TELEMETRY_DISABLED is "1"/"true".
   */
  enabled?: boolean;
  /** Optional namespace prefix rendered before each event name. */
  namespace?: string;
};

const TELEMETRY_DISABLED_VALUES = new Set(['1', 'true', 'on']);

function isTelemetryDisabled(): boolean {
  const raw = process.env.TELEMETRY_DISABLED;
  if (!raw) return false;
  return TELEMETRY_DISABLED_VALUES.has(raw.toLowerCase());
}

export function createConsoleTelemetryEmitter(
  options: ConsoleTelemetryOptions = {},
): TelemetryEmitter {
  const enabled = options.enabled ?? !isTelemetryDisabled();
  const namespace = options.namespace ? `${options.namespace}.` : '';

  return {
    emit(event: TelemetryEvent) {
      if (!enabled) return;
      const timestamp = event.timestamp ?? new Date().toISOString();
      const level = event.level ?? 'info';
      const method: keyof Console = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info';
      const payload = {
        timestamp,
        name: `${namespace}${event.name}`,
        level,
        properties: event.properties ?? {},
        context: event.context ?? {},
      };
      console[method]('[telemetry]', payload);
    },
  };
}

export function createNoopTelemetryEmitter(): TelemetryEmitter {
  return {
    emit() {
      // noop by design
    },
  };
}

let currentTelemetryEmitter: TelemetryEmitter = createConsoleTelemetryEmitter();

export function setTelemetryEmitter(emitter: TelemetryEmitter): void {
  currentTelemetryEmitter = emitter;
}

export function getTelemetryEmitter(): TelemetryEmitter {
  return currentTelemetryEmitter;
}

export async function emitTelemetryEvent(
  event: TelemetryEvent,
  emitter: TelemetryEmitter = getTelemetryEmitter(),
): Promise<void> {
  try {
    const payload: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
    await emitter.emit(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[telemetry] emit failed', { error: message, event: event.name });
  }
}

export function resetTelemetryEmitter(): void {
  currentTelemetryEmitter = createConsoleTelemetryEmitter();
}
