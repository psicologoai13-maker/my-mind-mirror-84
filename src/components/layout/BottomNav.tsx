import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, BarChart3, BookOpen, User, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ZenVoiceModal } from '@/components/voice/ZenVoiceModal';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: BarChart3, label: 'Analisi', path: '/analisi' },
  { icon: MessageCircle, label: 'Sessione', path: null, isMain: true },
  { icon: BookOpen, label: 'Diario', path: '/sessions' },
  { icon: User, label: 'Profilo', path: '/profile' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSessionChoice, setShowSessionChoice] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);

  const handleMainButtonClick = () => {
    setShowSessionChoice(prev => !prev);
  };

  const handleChatChoice = () => {
    setShowSessionChoice(false);
    navigate('/chat');
  };

  const handleVoiceChoice = () => {
    setShowSessionChoice(false);
    setShowVoiceModal(true);
  };

  return (
    <>
      <nav className="bottom-nav-fixed">
        <div className="flex items-center justify-around py-2.5 px-3 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = item.path ? location.pathname === item.path : false;
            const Icon = item.icon;

            if (item.isMain) {
              return (
                <div key="main-button" className="relative -mt-8">
                  {/* Session choice popup */}
                  {showSessionChoice && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex flex-col gap-2 animate-fade-in">
                      <button
                        onClick={handleChatChoice}
                        className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl shadow-card hover:bg-muted transition-all whitespace-nowrap"
                      >
                        <MessageCircle className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">Chat</span>
                      </button>
                      <button
                        onClick={handleVoiceChoice}
                        className="flex items-center gap-2 px-4 py-3 bg-card border border-border rounded-xl shadow-card hover:bg-muted transition-all whitespace-nowrap"
                      >
                        <Mic className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">Vocale</span>
                      </button>
                    </div>
                  )}
                  
                  <button
                    onClick={handleMainButtonClick}
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200",
                      "bg-primary shadow-card hover:scale-105",
                      showSessionChoice && "rotate-45"
                    )}
                  >
                    {showSessionChoice ? (
                      <X className="w-7 h-7 text-primary-foreground" />
                    ) : (
                      <Icon className="w-7 h-7 text-primary-foreground" />
                    )}
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

      <ZenVoiceModal 
        isOpen={showVoiceModal} 
        onClose={() => setShowVoiceModal(false)} 
      />
    </>
  );
};

export default BottomNav;