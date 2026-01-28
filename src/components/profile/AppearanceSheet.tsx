import React from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Sun, Moon, Smartphone, Type, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AppearanceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AppearanceSheet: React.FC<AppearanceSheetProps> = ({ open, onOpenChange }) => {
  const { theme, setTheme } = useTheme();
  const { profile, updateProfile } = useProfile();

  const appearanceSettings = (profile?.appearance_settings as Record<string, any>) || {
    theme: 'system',
    large_text: false,
    reduce_motion: false
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    handleSettingChange('theme', newTheme);
  };

  const handleSettingChange = async (key: string, value: any) => {
    try {
      const newSettings = { ...appearanceSettings, [key]: value };
      await updateProfile.mutateAsync({ 
        appearance_settings: newSettings as any 
      });
    } catch (error) {
      toast.error('Errore nel salvataggio');
    }
  };

  const themes = [
    { value: 'light', icon: Sun, label: 'Chiaro' },
    { value: 'dark', icon: Moon, label: 'Scuro' },
    { value: 'system', icon: Smartphone, label: 'Sistema' },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center font-display">Aspetto</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Theme Selection */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              🎨 Tema
            </p>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => handleThemeChange(t.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      isActive 
                        ? "border-primary bg-primary/10" 
                        : "border-border/50 bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon className={cn(
                      "w-6 h-6",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      isActive ? "text-primary" : "text-foreground"
                    )}>
                      {t.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accessibility Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                  <Type className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Testo Grande</p>
                  <p className="text-xs text-muted-foreground">Aumenta dimensione font</p>
                </div>
              </div>
              <Switch
                checked={appearanceSettings.large_text ?? false}
                onCheckedChange={(value) => {
                  handleSettingChange('large_text', value);
                  // Apply large text CSS class to root
                  if (value) {
                    document.documentElement.classList.add('large-text');
                  } else {
                    document.documentElement.classList.remove('large-text');
                  }
                  toast.success(value ? 'Testo grande attivato' : 'Testo normale');
                }}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">Riduci animazioni</p>
                  <p className="text-xs text-muted-foreground">Per sensibilità al movimento</p>
                </div>
              </div>
              <Switch
                checked={appearanceSettings.reduce_motion ?? false}
                onCheckedChange={(value) => {
                  handleSettingChange('reduce_motion', value);
                  // Apply reduced motion CSS class to root
                  if (value) {
                    document.documentElement.classList.add('reduce-motion');
                  } else {
                    document.documentElement.classList.remove('reduce-motion');
                  }
                  toast.success(value ? 'Animazioni ridotte' : 'Animazioni normali');
                }}
              />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AppearanceSheet;
