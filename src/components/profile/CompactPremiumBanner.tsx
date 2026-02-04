import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/hooks/useProfile';

const CompactPremiumBanner: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  // Don't show for premium users
  if (isPremium) return null;

  return (
    <button
      onClick={() => navigate('/plus')}
      className={cn(
        "w-full relative overflow-hidden rounded-2xl p-3",
        "bg-gradient-to-r from-aria-violet/10 via-aria-purple/10 to-aria-pink/10",
        "border border-aria-violet/20",
        "hover:border-aria-violet/40 active:scale-[0.99] transition-all"
      )}
    >
      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-liquid-shimmer bg-[length:200%_100%]" />
      
      <div className="relative z-10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-aria flex items-center justify-center shadow-aria-glow">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        
        <div className="flex-1 text-left">
          <span className="text-sm font-medium text-foreground">
            Passa a Plus
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            da €4,99/mese
          </span>
        </div>
        
        <ChevronRight className="w-4 h-4 text-aria-violet" />
      </div>
    </button>
  );
};

export default CompactPremiumBanner;
