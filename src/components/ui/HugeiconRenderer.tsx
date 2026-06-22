import { HugeiconsIcon } from '@hugeicons/react';

interface HugeiconRendererProps {
  icon: any;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export const HugeiconRenderer = ({
  icon: Icon,
  size = 18,
  className = '',
  color = 'currentColor',
  strokeWidth = 1.5,
}: HugeiconRendererProps) => (
  <HugeiconsIcon
    icon={Icon}
    size={size}
    color={color}
    strokeWidth={strokeWidth}
    className={className}
  />
);
