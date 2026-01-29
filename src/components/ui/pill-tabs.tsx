import * as React from "react";
import { cn } from "@/lib/utils";

interface PillTabsProps {
  tabs: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
  }>;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const PillTabs: React.FC<PillTabsProps> = ({
  tabs,
  value,
  onValueChange,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState({
    width: 0,
    left: 0,
  });

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const activeTab = container.querySelector(`[data-value="${value}"]`) as HTMLButtonElement;
    if (activeTab) {
      setIndicatorStyle({
        width: activeTab.offsetWidth,
        left: activeTab.offsetLeft,
      });
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative inline-flex items-center p-1.5 rounded-2xl",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-soft",
        className
      )}
    >
      {/* Animated indicator */}
      <div
        className={cn(
          "absolute top-1.5 h-[calc(100%-12px)] rounded-xl",
          "bg-card shadow-glass-glow border border-border/50",
          "transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        )}
        style={{
          width: indicatorStyle.width,
          left: indicatorStyle.left,
        }}
      />

      {/* Tabs */}
      {tabs.map((tab) => (
        <button
          key={tab.value}
          data-value={tab.value}
          onClick={() => onValueChange(tab.value)}
          className={cn(
            "relative z-10 flex items-center justify-center gap-2",
            "px-4 py-2.5 rounded-xl text-sm font-medium",
            "transition-colors duration-200",
            value === tab.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground/80"
          )}
        >
          {tab.icon && (
            <span className={cn(
              "transition-transform duration-200",
              value === tab.value && "scale-110"
            )}>
              {tab.icon}
            </span>
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// Simpler variant without animated indicator
const PillTabsSimple: React.FC<PillTabsProps> = ({
  tabs,
  value,
  onValueChange,
  className,
}) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 p-1 rounded-2xl",
        "bg-muted/50",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onValueChange(tab.value)}
          className={cn(
            "flex items-center justify-center gap-2",
            "px-4 py-2 rounded-xl text-sm font-medium",
            "transition-all duration-200",
            value === tab.value
              ? "bg-card text-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          )}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export { PillTabs, PillTabsSimple };
