declare namespace JSX {
  interface IntrinsicElements {
    style: {
      jsx?: boolean | undefined;
      global?: boolean | undefined;
      dynamic?: string | string[] | undefined;
      children?: string | undefined;
      [key: string]: any;
    };
  }
}
