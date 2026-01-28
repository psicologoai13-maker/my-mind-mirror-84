import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, BarChart3, Target, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVisualViewport } from '@/hooks/useVisualViewport';

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
  const { isKeyboardOpen } = useVisualViewport();

  // Hide navbar when keyboard is open to avoid overlap
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <nav className="bottom-nav-fixed">
      <div className="flex items-center justify-around py-2.5 px-3 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <div key="main-button" className="relative -mt-8">
                <button
                  onClick={() => navigate(item.path!)}
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
                    "bg-gradient-to-br from-primary via-primary to-purple-500 shadow-lg hover:scale-105",
                    "relative overflow-hidden",
                    isActive && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                  )}
                >
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-t from-white/0 to-white/20 rounded-2xl" />
                  <Icon className="w-7 h-7 text-primary-foreground relative z-10" />
                </button>
              </div>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => item.path && navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-300",
                isActive 
                  ? "text-primary bg-primary-light" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;