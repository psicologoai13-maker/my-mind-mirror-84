import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, CloudSun, Newspaper, Shield } from 'lucide-react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
  isLoading?: boolean;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onAllow,
  onDeny,
  isLoading = false,
}) => {
  const handleDeny = () => {
    onDeny();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 rounded-3xl">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Aria può sapere dove sei?
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Per offrirti un'esperienza più personalizzata
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
            <CloudSun className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-foreground">Meteo locale</p>
              <p className="text-xs text-muted-foreground">
                "Con questa pioggia a Torino, capisco se ti senti giù..."
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
            <Newspaper className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-foreground">Contesto locale</p>
              <p className="text-xs text-muted-foreground">
                Eventi e notizie rilevanti per la tua zona
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
            <Shield className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-foreground">Privacy garantita</p>
              <p className="text-xs text-muted-foreground">
                La tua posizione non viene mai salvata permanentemente. Puoi revocare in qualsiasi momento.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button 
            onClick={onAllow}
            disabled={isLoading}
            className="w-full h-12 rounded-xl"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ottenendo posizione...
              </span>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Consenti
              </>
            )}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleDeny}
            className="w-full h-10 text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            Non ora
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Puoi modificare questa scelta in Profilo → Privacy
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionModal;
