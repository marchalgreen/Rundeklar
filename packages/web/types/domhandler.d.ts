declare module 'domhandler' {
  export interface Element {
    type: string;
    name?: string;
    tagName?: string;
    attribs?: Record<string, string | undefined>;
    children?: Element[];
    parent?: Element | null;
    next?: Element | null;
    prev?: Element | null;
  }
}
