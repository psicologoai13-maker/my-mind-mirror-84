import React from 'react';
import { MapPin, Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useProfile } from '@/hooks/useProfile';
import { useUserLocation } from '@/hooks/useUserLocation';

const PrivacySettingsCard: React.FC = () => {
  const { profile, updateProfile } = useProfile();
  const { permission, requestLocation, clearLocation, isLoading } = useUserLocation();
  
  const locationEnabled = profile?.location_permission_granted ?? false;
  
  const handleLocationToggle = async (checked: boolean) => {
    if (checked) {
      await requestLocation();
    } else {
      clearLocation();
    }
  };

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Privacy Aria</h3>
            <p className="text-xs text-muted-foreground">Gestisci i dati condivisi con Aria</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Location Permission */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm text-foreground">Condividi posizione</p>
              <p className="text-xs text-muted-foreground">
                Aria può contestualizzare meteo e zona
              </p>
            </div>
          </div>
          <Switch 
            checked={locationEnabled}
            onCheckedChange={handleLocationToggle}
            disabled={isLoading}
          />
        </div>
        
        <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-xl">
          La posizione viene usata solo durante le sessioni e non viene mai salvata permanentemente.
        </p>
      </div>
    </div>
  );
};

export default PrivacySettingsCard;
