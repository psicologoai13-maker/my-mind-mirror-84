import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Moon,
  Stethoscope,
  Gem,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRewardPoints } from '@/hooks/useRewardPoints';
import { toast } from 'sonner';
import LegalDisclaimer from '@/components/layout/LegalDisclaimer';
import ProfileBadgesRow from '@/components/profile/ProfileBadgesRow';
import ProfileStatsRow from '@/components/profile/ProfileStatsRow';
import PremiumCard from '@/components/profile/PremiumCard';
import PointsProgressCard from '@/components/profile/PointsProgressCard';
import NotificationsSheet from '@/components/profile/NotificationsSheet';
import AppearanceSheet from '@/components/profile/AppearanceSheet';
import { Badge } from '@/components/ui/badge';

type SettingsAction = string | 'notifications' | 'appearance';

interface SettingsItem {
  icon: React.ElementType;
  label: string;
  description: string;
  action: SettingsAction | null;
}

const settingsItems: SettingsItem[] = [
  { icon: User, label: 'Dati personali', description: 'Modifica il tuo profilo', action: '/profile/personal' },
  { icon: Sparkles, label: 'I Miei Interessi', description: 'Sport, hobby, preferenze', action: '/profile/interests' },
  { icon: Bell, label: 'Notifiche', description: 'Gestisci le tue preferenze', action: 'notifications' },
  { icon: Moon, label: 'Aspetto', description: 'Tema e accessibilità', action: 'appearance' },
  { icon: Shield, label: 'Privacy Aria', description: 'Dati e sicurezza', action: '/profile/privacy' },
  { icon: Stethoscope, label: 'Area Terapeutica', description: 'Condivisione dati clinici', action: '/profile/clinical' },
  { icon: HelpCircle, label: 'Aiuto', description: 'FAQ e supporto', action: '/profile/help' },
];

const Profile: React.FC = () => {
  const { signOut, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { totalPoints, isLoading: pointsLoading } = useRewardPoints();
  const navigate = useNavigate();
  
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    toast.success('Arrivederci!');
    navigate('/auth');
  };

  const handleSettingsClick = (action: SettingsAction | null) => {
    if (!action) return;
    
    if (action === 'notifications') {
      setNotificationsOpen(true);
    } else if (action === 'appearance') {
      setAppearanceOpen(true);
    } else {
      navigate(action);
    }
  };

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Profilo</h1>
            <p className="text-muted-foreground text-sm mt-1">Le tue impostazioni</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl bg-card shadow-soft">
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </header>

      <div className="px-5 space-y-5 pb-8">
        {/* Profile Header - Glass Card with Earn Points */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-5",
          "bg-glass backdrop-blur-xl border border-glass-border",
          "shadow-glass"
        )}>
          {/* Inner light reflection */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="font-display text-xl font-semibold text-foreground truncate">
                  {profileLoading ? '...' : (profile?.name || 'Utente')}
                </h2>
                <Badge 
                  variant={isPremium ? "default" : "secondary"}
                  className={cn(
                    "shrink-0",
                    isPremium && "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-sm"
                  )}
                >
                  {isPremium ? '✨ Plus' : 'Free'}
                </Badge>
              </div>
              
              {/* Stats Row - Points, Days, Sessions on same line */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Points */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-aria-subtle rounded-xl">
                  <Gem className="w-4 h-4 text-aria-violet" />
                  <span className="text-sm font-bold text-aria-violet">
                    {pointsLoading ? '...' : totalPoints.toLocaleString()}
                  </span>
                  <span className="text-xs text-muted-foreground">punti</span>
                </div>
                
                {/* Days & Sessions */}
                <ProfileStatsRow />
              </div>
            </div>
          </div>

          {/* Badges Row */}
          <ProfileBadgesRow />
          
          {/* Earn Points Section - Compact */}
          <PointsProgressCard compact />
        </div>

        {/* Premium Card - At Top */}
        <PremiumCard />

        {/* Settings Menu - Glass Card */}
        <div className={cn(
          "relative overflow-hidden rounded-3xl",
          "bg-glass backdrop-blur-xl border border-glass-border",
          "shadow-glass"
        )}>
          {/* Inner light */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-2.5 px-4 py-3 border-b border-glass-border/30">
            <span className="text-xl">⚙️</span>
            <h3 className="font-display font-semibold text-sm text-foreground">
              Impostazioni
            </h3>
          </div>
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => handleSettingsClick(item.action)}
                className={cn(
                  "relative z-10 w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors",
                  index !== settingsItems.length - 1 && "border-b border-border/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center backdrop-blur-sm",
                  item.action === '/profile/clinical' 
                    ? "bg-primary/10" 
                    : "bg-muted/50"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    item.action === '/profile/clinical' 
                      ? "text-primary" 
                      : "text-foreground"
                  )} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <Button 
          variant="outline" 
          className={cn(
            "w-full rounded-2xl",
            "bg-glass backdrop-blur-xl border-glass-border",
            "text-destructive hover:bg-destructive/10 hover:border-destructive/30"
          )}
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Esci
        </Button>

        {/* Footer */}
        <LegalDisclaimer variant="compact" />
        <p className="text-center text-xs text-muted-foreground mt-2">
          Aria v1.0.0 • Made with 💚
        </p>
      </div>

      {/* Sheets */}
      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <AppearanceSheet open={appearanceOpen} onOpenChange={setAppearanceOpen} />
    </MobileLayout>
  );
};

export default Profile;
