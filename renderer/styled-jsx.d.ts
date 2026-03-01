/* eslint-disable no-undef */

import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      style: React.DetailedHTMLProps<
        {
          jsx?: boolean;
          global?: boolean;
          dynamic?: string | string[];
          [key: string]: any;
        } & React.StyleHTMLAttributes<HTMLStyleElement>,
        HTMLStyleElement
      > & {
        children?: string;
      };
    }
  }
}

export {};
