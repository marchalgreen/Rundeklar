export type MockRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
};

export class MockRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  private readonly body: unknown;

  constructor(url: string, init: MockRequestInit = {}) {
    this.url = url;
    this.method = init.method ?? 'POST';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }

  async json(): Promise<unknown> {
    if (this.body === undefined) {
      throw new Error('No body provided');
    }
    if (typeof this.body === 'string') {
      return JSON.parse(this.body);
    }
    return this.body;
  }
}

export function makeRequest(url: string, init: MockRequestInit = {}) {
  return new MockRequest(url, init);
}
