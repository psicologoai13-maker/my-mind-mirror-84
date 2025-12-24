import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, BarChart3, Calendar, User, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VoiceSessionModal } from '@/components/voice/VoiceSessionModal';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: BarChart3, label: 'Progressi', path: '/progress' },
  { icon: MessageCircle, label: 'Sessione', path: null, isMain: true },
  { icon: Calendar, label: 'Sessioni', path: '/sessions' },
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
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-card/95 backdrop-blur-lg border-t border-border shadow-card z-50">
        <div className="flex items-center justify-around py-2 px-2">
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
                      "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
                      "bg-gradient-hero shadow-card hover:shadow-glow hover:scale-105",
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

      <VoiceSessionModal 
        open={showVoiceModal} 
        onOpenChange={setShowVoiceModal} 
      />
    </>
  );
};

export default BottomNav;
