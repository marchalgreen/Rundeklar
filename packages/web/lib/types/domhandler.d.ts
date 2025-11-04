declare module 'domhandler' {
  export interface Element {
    type?: string;
    name?: string;
    tagName?: string;
    attribs?: Record<string, string>;
    children?: Element[];
    data?: string;
  }
}
