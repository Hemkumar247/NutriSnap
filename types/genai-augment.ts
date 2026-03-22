import type { Session } from '@google/genai';

declare module '@google/genai' {
  /** Alias for `Session` — used by existing app code; SDK exports `Session`. */
  export type LiveSession = Session;
}

export {};
