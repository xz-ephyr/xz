import * as React from "react";
import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";
import { cn } from "@/lib/utils";

export interface IconProps extends Omit<HugeiconsIconProps, "icon"> {
  icon: HugeiconsIconProps["icon"];
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ className, icon, size = 20, strokeWidth = 2, ...props }, ref) => {
    return (
      <HugeiconsIcon
        ref={ref}
        icon={icon}
        size={size}
        strokeWidth={strokeWidth}
        className={cn("shrink-0", className)}
        {...props}
      />
    );
  }
);

Icon.displayName = "Icon";

export { Icon };
