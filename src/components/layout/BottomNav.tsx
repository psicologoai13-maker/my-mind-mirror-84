import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, BarChart3, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: BarChart3, label: 'Progressi', path: '/progress' },
  { icon: MessageCircle, label: 'Chat', path: '/chat', isMain: true },
  { icon: Calendar, label: 'Sessioni', path: '/sessions' },
  { icon: User, label: 'Profilo', path: '/profile' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur-lg border-t border-border shadow-card z-50">
      <div className="flex items-center justify-around py-2 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isMain) {
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="relative -mt-8"
              >
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                  "bg-gradient-hero shadow-card hover:shadow-glow hover:scale-105",
                  isActive && "shadow-glow scale-105"
                )}>
                  <Icon className="w-7 h-7 text-primary-foreground" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
