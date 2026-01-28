import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Bell, MessageSquare, Sparkles, Target, Smartphone } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationSetting {
  key: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const notificationSettings: NotificationSetting[] = [
  {
    key: 'checkin_reminder',
    icon: <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
    label: 'Reminder Check-in',
    description: 'Ogni giorno alle 09:00'
  },
  {
    key: 'session_reminder',
    icon: <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
    label: 'Reminder Sessioni',
    description: 'Ricorda di parlare con Aria'
  },
  {
    key: 'daily_insights',
    icon: <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
    label: 'Insight Giornalieri',
    description: 'Analisi e suggerimenti'
  },
  {
    key: 'goal_completed',
    icon: <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
    label: 'Obiettivi completati',
    description: 'Festeggia i tuoi successi'
  },
  {
    key: 'app_updates',
    icon: <Smartphone className="w-5 h-5 text-slate-600 dark:text-slate-400" />,
    label: 'Aggiornamenti App',
    description: 'Nuove funzionalità'
  },
];

const NotificationsSheet: React.FC<NotificationsSheetProps> = ({ open, onOpenChange }) => {
  const { profile, updateProfile } = useProfile();

  const settings = (profile?.notification_settings as Record<string, boolean>) || {
    checkin_reminder: true,
    session_reminder: true,
    daily_insights: true,
    goal_completed: true,
    app_updates: false
  };

  const handleToggle = async (key: string, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      await updateProfile.mutateAsync({ 
        notification_settings: newSettings as any 
      });
      toast.success('Preferenza salvata');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display">Notifiche</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-6">
          {notificationSettings.map((setting) => (
            <div 
              key={setting.key}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                  {setting.icon}
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <Switch
                checked={settings[setting.key] ?? false}
                onCheckedChange={(value) => handleToggle(setting.key, value)}
              />
            </div>
          ))}

          <p className="text-xs text-muted-foreground text-center pt-4">
            Le notifiche push saranno disponibili nella prossima versione.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsSheet;
