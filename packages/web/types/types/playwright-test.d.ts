declare module '@playwright/test' {
  export type Browser = any;
  export type BrowserContext = any;
  export type Page = any;
  export type Response = any;
  export type Route = any;
  export type Request = any;
  export type TestInfo = any;
  export type APIRequestContext = any;
  export type FullConfig = any;

  export const chromium: any;
  export const expect: any;
  export const devices: Record<string, any>;
  export function defineConfig(config: any): any;

  export const test: any;
}
