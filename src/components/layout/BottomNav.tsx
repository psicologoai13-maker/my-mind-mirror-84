import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Target, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: BarChart3, label: 'Analisi', path: '/analisi' },
  { icon: Sparkles, label: 'Aria', path: '/aria', isMain: true },
  { icon: Target, label: 'Progressi', path: '/objectives' },
  { icon: User, label: 'Profilo', path: '/profile' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isHidden, setIsHidden] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Listen for custom event to hide/show nav
  useEffect(() => {
    const handleHideNav = () => setIsHidden(true);
    const handleShowNav = () => setIsHidden(false);
    
    window.addEventListener('hide-bottom-nav', handleHideNav);
    window.addEventListener('show-bottom-nav', handleShowNav);
    
    return () => {
      window.removeEventListener('hide-bottom-nav', handleHideNav);
      window.removeEventListener('show-bottom-nav', handleShowNav);
    };
  }, []);

  // Simple keyboard detection based on focus events only
  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        setIsKeyboardOpen(true);
      }
    };
    
    const handleFocusOut = () => {
      // Small delay to prevent flicker between focus changes
      setTimeout(() => {
        const active = document.activeElement as HTMLElement;
        if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA' && !active?.isContentEditable) {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };
    
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Hide navbar when keyboard is open or when explicitly hidden
  if (isKeyboardOpen || isHidden) {
    return null;
  }

  return (
    <nav 
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-[9999]",
        "w-[calc(100%-2rem)] max-w-sm",
        "bottom-4 pb-[env(safe-area-inset-bottom,0px)]"
      )}
      style={{ willChange: 'transform' }}
    >
      {/* Floating Glass Dock */}
      <div className={cn(
        "relative flex items-center justify-around",
        "py-2 px-2 rounded-[28px]",
        "bg-glass backdrop-blur-xl backdrop-saturate-150",
        "border border-glass-border",
        "shadow-glass-elevated"
      )}>
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-[28px] bg-gradient-to-t from-transparent via-white/5 to-white/10 pointer-events-none" />
        
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <div key="main-button" className="relative -mt-6 mx-2">
                {/* Aria Aurora Glow behind button */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl blur-xl transition-all duration-500",
                  "bg-gradient-aria",
                  isActive ? "opacity-70 scale-110" : "opacity-40"
                )} />
                
                <button
                  onClick={() => navigate(item.path!)}
                  data-tutorial="aria-button"
                  style={{ borderRadius: '16px' }}
                  className={cn(
                    "relative w-14 h-14 flex items-center justify-center overflow-hidden",
                    "bg-gradient-aria",
                    "shadow-aria-glow",
                    "transition-all duration-300 ease-out",
                    "hover:scale-105 active:scale-95",
                    isActive && "animate-aria-breathe"
                  )}
                >
                  <Icon className="w-7 h-7 text-white relative z-10" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => item.path && navigate(item.path)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl",
                "transition-all duration-300 ease-out",
                "group"
              )}
            >
              {/* Active indicator glow */}
              {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-fade-in" />
              )}
              
              <Icon className={cn(
                "w-6 h-6 transition-all duration-300",
                isActive 
                  ? "text-primary scale-110" 
                  : "text-muted-foreground group-hover:text-foreground group-hover:scale-105"
              )} />
              <span className={cn(
                "text-xs font-medium transition-colors duration-300",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground group-hover:text-foreground"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
