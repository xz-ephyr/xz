declare module '@hugeicons/react' {
  import type { ComponentType, SVGProps } from 'react';

  export interface IconSvgElement {
    readonly [key: string]: unknown;
  }

  export interface HugeiconsIconProps extends SVGProps<SVGSVGElement> {
    icon: IconSvgElement;
    size?: number | string;
    strokeWidth?: number;
  }

  export const HugeiconsIcon: ComponentType<HugeiconsIconProps>;
}
