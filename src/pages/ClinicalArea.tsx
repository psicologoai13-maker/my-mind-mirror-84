import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import ClinicalReportDialog from '@/components/profile/ClinicalReportDialog';
import PatientConnectionCode from '@/components/profile/PatientConnectionCode';
import LegalDisclaimer from '@/components/layout/LegalDisclaimer';

const ClinicalArea: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout hideNav>
      {/* Header */}
      <header className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon-sm" 
            onClick={() => navigate('/profile')}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Area Terapeutica</h1>
            <p className="text-muted-foreground text-sm">Condivisione dati con il tuo terapeuta</p>
          </div>
        </div>
      </header>

      <div className="px-5 space-y-6 pb-8">
        {/* Privacy Intro Card */}
        <div className="bg-card rounded-3xl p-6 shadow-premium border border-border/50 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-foreground mb-1">
                I tuoi dati sono protetti
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Solo tu puoi decidere se e quando condividere i tuoi progressi con un professionista. 
                Il codice di connessione è temporaneo e può essere revocato in qualsiasi momento.
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Report Section */}
        <section className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1">
            📄 Report Clinico
          </h2>
          <ClinicalReportDialog />
        </section>

        {/* Patient Connection Code Section */}
        <section className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-display font-semibold text-foreground mb-3 px-1">
            🔗 Connessione Terapeuta
          </h2>
          <PatientConnectionCode />
        </section>

        {/* Legal Disclaimer */}
        <section className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <LegalDisclaimer variant="full" />
        </section>

        {/* Back Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => navigate('/profile')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna al Profilo
        </Button>
      </div>
    </MobileLayout>
  );
};

export default ClinicalArea;
