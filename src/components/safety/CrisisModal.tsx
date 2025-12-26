import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Phone, Heart, AlertTriangle, ExternalLink } from 'lucide-react';

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const emergencyContacts = [
  { 
    name: 'Telefono Amico', 
    number: '02 2327 2327',
    description: 'Supporto emotivo 24/7'
  },
  { 
    name: 'Telefono Azzurro', 
    number: '19696',
    description: 'Linea per minori e giovani'
  },
  { 
    name: 'Emergenza', 
    number: '112',
    description: 'Numero unico emergenze'
  },
];

const CrisisModal: React.FC<CrisisModalProps> = ({ isOpen, onClose }) => {
  const [confirmClose, setConfirmClose] = React.useState(false);

  const handleAttemptClose = () => {
    if (!confirmClose) {
      setConfirmClose(true);
      return;
    }
    onClose();
    setConfirmClose(false);
  };

  const handleCall = (number: string) => {
    window.location.href = `tel:${number.replace(/\s/g, '')}`;
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={() => {}}>
      <AlertDialogContent className="max-w-md mx-auto bg-gradient-to-b from-destructive/5 to-background border-destructive/20">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <AlertDialogTitle className="text-xl font-display text-foreground">
            Sembra che tu stia attraversando un momento difficile
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Non sei solo/a. È importante parlare con qualcuno che può aiutarti professionalmente. 
            Contatta subito uno di questi servizi di supporto.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 my-4">
          {emergencyContacts.map((contact) => (
            <Button
              key={contact.number}
              variant="outline"
              className="w-full h-auto py-4 px-4 flex items-center justify-between border-border hover:bg-muted/50 hover:border-primary/30"
              onClick={() => handleCall(contact.number)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.description}</p>
                </div>
              </div>
              <span className="font-mono text-primary font-semibold">{contact.number}</span>
            </Button>
          ))}
        </div>

        <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
          <Heart className="w-5 h-5 text-area-love mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            Questa app è uno strumento di supporto al benessere e <strong>non sostituisce il parere medico</strong>. 
            I professionisti sopra sono formati per aiutarti.
          </p>
        </div>

        <div className="flex flex-col gap-2 mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={handleAttemptClose}
          >
            {confirmClose ? 'Conferma che stai meglio e chiudi' : 'Sto meglio adesso'}
          </Button>
          {confirmClose && (
            <p className="text-xs text-center text-muted-foreground">
              Clicca di nuovo per confermare
            </p>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CrisisModal;
