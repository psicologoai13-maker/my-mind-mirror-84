import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Sparkles, 
  Bell, 
  Moon, 
  Shield, 
  Stethoscope, 
  HelpCircle, 
  Gift,
  ChevronRight 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SettingsItem {
  icon: React.ElementType;
  label: string;
  action: string;
  badge?: string;
}

interface SettingsGroup {
  label: string;
  emoji: string;
  items: SettingsItem[];
}

interface SettingsGroupListProps {
  onNotificationsClick: () => void;
  onAppearanceClick: () => void;
  onReferralClick?: () => void;
}

const settingsGroups: SettingsGroup[] = [
  {
    label: 'Account',
    emoji: '👤',
    items: [
      { icon: User, label: 'Dati personali', action: '/profile/personal' },
      { icon: Sparkles, label: 'I miei interessi', action: '/profile/interests' },
    ]
  },
  {
    label: 'Preferenze',
    emoji: '⚙️',
    items: [
      { icon: Bell, label: 'Notifiche', action: 'notifications' },
      { icon: Moon, label: 'Aspetto', action: 'appearance' },
      { icon: Shield, label: 'Privacy', action: '/profile/privacy' },
    ]
  },
  {
    label: 'Salute',
    emoji: '🏥',
    items: [
      { icon: Stethoscope, label: 'Area Terapeutica', action: '/profile/clinical' },
    ]
  },
  {
    label: 'Supporto',
    emoji: '❓',
    items: [
      { icon: HelpCircle, label: 'Aiuto', action: '/profile/help' },
      { icon: Gift, label: 'Invita amici', action: 'referral', badge: '+400' },
    ]
  }
];

const SettingsGroupList: React.FC<SettingsGroupListProps> = ({
  onNotificationsClick,
  onAppearanceClick,
  onReferralClick
}) => {
  const navigate = useNavigate();

  const handleItemClick = (action: string) => {
    if (action === 'notifications') {
      onNotificationsClick();
    } else if (action === 'appearance') {
      onAppearanceClick();
    } else if (action === 'referral') {
      onReferralClick?.();
    } else {
      navigate(action);
    }
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-3xl",
      "bg-glass backdrop-blur-xl border border-glass-border",
      "shadow-glass"
    )}>
      {/* Inner light */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative z-10 divide-y divide-border/20">
        {settingsGroups.map((group) => (
          <div key={group.label} className="p-3">
            {/* Group Header */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-sm">{group.emoji}</span>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {group.label}
              </span>
            </div>
            
            {/* Group Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => handleItemClick(item.action)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
                      "hover:bg-muted/30 active:bg-muted/50 transition-colors"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      item.action === '/profile/clinical' 
                        ? "bg-primary/10" 
                        : "bg-muted/50"
                    )}>
                      <Icon className={cn(
                        "w-4 h-4",
                        item.action === '/profile/clinical' 
                          ? "text-primary" 
                          : "text-foreground"
                      )} />
                    </div>
                    <span className="flex-1 text-left text-sm font-medium text-foreground">
                      {item.label}
                    </span>
                    {item.badge && (
                      <Badge 
                        variant="secondary" 
                        className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] px-1.5"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingsGroupList;
