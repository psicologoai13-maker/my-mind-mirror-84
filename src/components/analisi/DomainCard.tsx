import React from 'react';
import { cn } from '@/lib/utils';
import { ClinicalDomain } from '@/lib/clinicalDomains';

interface DomainCardProps {
  domain: ClinicalDomain;
  children: React.ReactNode;
  className?: string;
}

const DomainCard: React.FC<DomainCardProps> = ({
  domain,
  children,
  className
}) => {
  return (
    <div
      className={cn(
        "rounded-3xl overflow-hidden",
        "bg-glass backdrop-blur-xl border border-glass-border",
        "shadow-glass",
        className
      )}
    >
      {/* Domain Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-glass-border/50">
        <span className="text-xl">{domain.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-foreground">
            {domain.label}
          </h3>
          {domain.description && (
            <p className="text-[10px] text-muted-foreground truncate">
              {domain.description}
            </p>
          )}
        </div>
      </div>
      
      {/* Metrics Content */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
};

export default DomainCard;
