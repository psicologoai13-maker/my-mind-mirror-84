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
  Globe,
  CreditCard,
  Heart,
  Stethoscope
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSessions } from '@/hooks/useSessions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import LegalDisclaimer from '@/components/layout/LegalDisclaimer';
import PrivacySettingsCard from '@/components/profile/PrivacySettingsCard';

const menuItems = [
  { icon: User, label: 'Dati personali', description: 'Modifica il tuo profilo', action: null },
  { icon: Bell, label: 'Notifiche', description: 'Gestisci le tue preferenze', action: null },
  { icon: Moon, label: 'Aspetto', description: 'Tema e accessibilità', action: null },
  { icon: Globe, label: 'Lingua', description: 'Italiano', action: null },
  { icon: Shield, label: 'Privacy', description: 'Dati e sicurezza', action: null },
  { icon: CreditCard, label: 'Abbonamento', description: 'Piano gratuito', action: null },
  { icon: Stethoscope, label: 'Area Terapeutica', description: 'Condivisione dati clinici', action: '/profile/clinical' },
  { icon: HelpCircle, label: 'Aiuto', description: 'FAQ e supporto', action: null },
];

const Profile: React.FC = () => {
  const { signOut, user } = useAuth();
  const { profile, isLoading: profileLoading } = useProfile();
  const { stats, completedSessions } = useSessions();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast.success('Arrivederci!');
    navigate('/auth');
  };

  const memberSince = profile?.created_at 
    ? format(new Date(profile.created_at), 'MMMM yyyy', { locale: it })
    : '';

  const wellnessScore = profile?.wellness_score || 0;

  // Calculate streak (simplified - would need more logic for real implementation)
  const streak = Math.min(completedSessions.length, 30);

  return (
    <MobileLayout>
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">Profilo</h1>
          <Button variant="ghost" size="icon-sm">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Profile Card */}
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-card animate-slide-up">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {profileLoading ? '...' : (profile?.name || 'Utente')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {user?.email || ''}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-1 rounded-full">
                  Free
                </span>
                {memberSince && (
                  <span className="text-xs text-muted-foreground">
                    Membro da {memberSince}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up stagger-2">
          <div className="bg-card rounded-2xl p-4 text-center shadow-card border border-border/50">
            <p className="text-2xl font-display font-semibold text-primary">
              {stats.totalSessions}
            </p>
            <p className="text-xs text-muted-foreground">Sessioni</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center shadow-card border border-border/50">
            <p className="text-2xl font-display font-semibold text-area-love">{streak}</p>
            <p className="text-xs text-muted-foreground">Giorni streak</p>
          </div>
          <div className="bg-card rounded-2xl p-4 text-center shadow-card border border-border/50">
            <p className="text-2xl font-display font-semibold text-area-work">
              {wellnessScore > 0 ? Math.round(wellnessScore / 10) : 0}
            </p>
            <p className="text-xs text-muted-foreground">Obiettivi</p>
          </div>
        </div>

        {/* Wellness Score */}
        <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50 animate-slide-up stagger-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">
              Il tuo punteggio benessere
            </h3>
            <Heart className="w-5 h-5 text-area-love" />
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="hsl(var(--muted))"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="hsl(var(--primary))"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${wellnessScore * 2.26} ${100 * 2.26}`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-display font-semibold text-foreground">
                  {wellnessScore}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                {wellnessScore > 0 
                  ? `Il tuo benessere è ${wellnessScore >= 70 ? 'ottimo' : wellnessScore >= 50 ? 'buono' : 'in crescita'}!`
                  : 'Completa delle sessioni per vedere il tuo punteggio'
                }
              </p>
              <Button variant="outline" size="sm">Vedi dettagli</Button>
            </div>
          </div>
        </div>

        {/* Privacy Settings for Aria */}
        <PrivacySettingsCard />

        {/* Menu Items */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden animate-slide-up stagger-4">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => item.action && navigate(item.action)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors",
                  index !== menuItems.length - 1 && "border-b border-border"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  item.action === '/profile/clinical' 
                    ? "bg-emerald-100 dark:bg-emerald-900/30" 
                    : "bg-muted"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    item.action === '/profile/clinical' 
                      ? "text-emerald-600 dark:text-emerald-400" 
                      : "text-foreground"
                  )} />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Esci
        </Button>

        {/* Version */}
        <LegalDisclaimer variant="compact" />
        <p className="text-center text-xs text-muted-foreground mt-2">
          Serenity v1.0.0 • Made with 💚
        </p>
      </div>
    </MobileLayout>
  );
};

export default Profile;
