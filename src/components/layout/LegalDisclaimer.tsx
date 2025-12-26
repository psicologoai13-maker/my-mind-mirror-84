import React from 'react';
import { AlertCircle } from 'lucide-react';

interface LegalDisclaimerProps {
  variant?: 'compact' | 'full';
  className?: string;
}

const LegalDisclaimer: React.FC<LegalDisclaimerProps> = ({ 
  variant = 'compact',
  className = ''
}) => {
  if (variant === 'compact') {
    return (
      <p className={`text-xs text-muted-foreground text-center ${className}`}>
        Questa app è uno strumento di supporto al benessere e non sostituisce il parere medico.
        <br />
        In caso di emergenza, contattare il <strong>112</strong>.
      </p>
    );
  }

  return (
    <div className={`bg-muted/50 rounded-xl p-4 flex items-start gap-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Disclaimer Legale</p>
        <p>
          Questa app è uno strumento di supporto al benessere e <strong>non sostituisce il parere medico</strong>. 
          Le informazioni fornite non costituiscono diagnosi o prescrizioni mediche.
        </p>
        <p className="mt-2">
          In caso di emergenza o pensieri di autolesionismo, contattare immediatamente il <strong>112</strong> 
          o il <strong>Telefono Amico (02 2327 2327)</strong>.
        </p>
      </div>
    </div>
  );
};

export default LegalDisclaimer;
