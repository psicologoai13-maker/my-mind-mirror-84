import React from 'react';
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
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import LegalDisclaimer from '@/components/layout/LegalDisclaimer';
import StreakStatsCard from '@/components/profile/StreakStatsCard';
import RewardPointsCard from '@/components/profile/RewardPointsCard';
import BadgesGrid from '@/components/profile/BadgesGrid';
import ReferralCard from '@/components/profile/ReferralCard';
import SubscriptionCard from '@/components/profile/SubscriptionCard';
import { Badge } from '@/components/ui/badge';

const settingsItems = [
  { icon: User, label: 'Dati personali', description: 'Modifica il tuo profilo', action: null },
  { icon: Bell, label: 'Notifiche', description: 'Gestisci le tue preferenze', action: null },
  { icon: Moon, label: 'Aspetto', description: 'Tema e accessibilità', action: null },
  { icon: Shield, label: 'Privacy Aria', description: 'Dati e sicurezza', action: null },
  { icon: Stethoscope, label: 'Area Terapeutica', description: 'Condivisione dati clinici', action: '/profile/clinical' },
  { icon: HelpCircle, label: 'Aiuto', description: 'FAQ e supporto', action: null },
];

const Profile: React.FC = () => {
  const { signOut, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Arrivederci!');
    navigate('/auth');
  };

  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: it })
    : '';

  const isPremium = profile?.premium_until && new Date(profile.premium_until) > new Date();

  return (
    <MobileLayout>
      <header className="px-6 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Profilo</h1>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="px-6 space-y-5 pb-8">
        {/* Profile Header Card */}
        <div className="bg-card rounded-3xl p-5 border border-border/50 shadow-premium">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shadow-lg">
              <span className="text-3xl">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl font-semibold text-foreground truncate">
                {profileLoading ? '...' : (profile?.name || 'Utente')}
              </h2>
              <p className="text-muted-foreground text-sm truncate">
                {user?.email || ''}
              </p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge 
                  variant={isPremium ? "default" : "secondary"}
                  className={isPremium 
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0" 
                    : ""
                  }
                >
                  {isPremium ? '✨ Plus' : 'Free'}
                </Badge>
                {memberSince && (
                  <span className="text-xs text-muted-foreground">
                    • Membro da {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Streak & Stats */}
        <StreakStatsCard />

        {/* Reward Points */}
        <RewardPointsCard />

        {/* Badges Grid */}
        <BadgesGrid />

        {/* Referral Card */}
        <ReferralCard />

        {/* Subscription Status */}
        <SubscriptionCard />

        {/* Settings Menu */}
        <div className="bg-card rounded-3xl shadow-premium border border-border/50 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/50">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Impostazioni
            </h3>
          </div>
          {settingsItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.action && navigate(item.action)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors",
                  index !== settingsItems.length - 1 && "border-b border-border/30"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  item.action === '/profile/clinical' 
                    ? "bg-emerald-100 dark:bg-emerald-900/30" 
                    : "bg-muted/50"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    item.action === '/profile/clinical' 
                      ? "text-emerald-600 dark:text-emerald-400" 
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
          className="w-full rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
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
    </MobileLayout>
  );
};

export default Profile;
