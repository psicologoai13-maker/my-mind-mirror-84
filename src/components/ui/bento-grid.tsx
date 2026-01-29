import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const bentoGridVariants = cva("grid gap-4", {
  variants: {
    columns: {
      2: "grid-cols-2",
      3: "grid-cols-3",
      4: "grid-cols-4",
      auto: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    },
  },
  defaultVariants: {
    columns: 2,
  },
});

export interface BentoGridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bentoGridVariants> {}

const BentoGrid = React.forwardRef<HTMLDivElement, BentoGridProps>(
  ({ className, columns, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(bentoGridVariants({ columns }), className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BentoGrid.displayName = "BentoGrid";

// Bento Item with size variants
const bentoItemVariants = cva(
  "relative overflow-hidden rounded-3xl animate-scale-in",
  {
    variants: {
      size: {
        small: "col-span-1 row-span-1",
        medium: "col-span-1 row-span-2",
        large: "col-span-2 row-span-1",
        featured: "col-span-2 row-span-2",
      },
    },
    defaultVariants: {
      size: "small",
    },
  }
);

export interface BentoItemProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bentoItemVariants> {
  delay?: number;
}

const BentoItem = React.forwardRef<HTMLDivElement, BentoItemProps>(
  ({ className, size, delay = 0, style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(bentoItemVariants({ size }), className)}
        style={{
          ...style,
          animationDelay: `${delay * 0.05}s`,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);
BentoItem.displayName = "BentoItem";

export { BentoGrid, BentoItem, bentoGridVariants, bentoItemVariants };
