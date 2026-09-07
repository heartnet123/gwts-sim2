import React from 'react';

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'iconify-icon': React.DetailedHTMLProps<
          React.HTMLAttributes<HTMLElement> & {
            icon?: string;
            width?: string | number;
            height?: string | number;
            inline?: boolean;
          },
          HTMLElement
        >;
      }
    }
  }
  namespace JSX {
    interface IntrinsicElements {
      'iconify-icon': any;
    }
  }
}

