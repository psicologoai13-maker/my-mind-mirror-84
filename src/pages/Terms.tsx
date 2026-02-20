import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Terms: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background">
      <header className="px-6 pt-8 pb-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold text-foreground">Termini di Servizio</h1>
      </header>

      <div className="px-6 pb-12 space-y-6 text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground">Ultimo aggiornamento: 20 Febbraio 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">1. Accettazione dei Termini</h2>
          <p>Utilizzando l'app Serenity ("Servizio"), accetti i presenti Termini di Servizio. Se non accetti, ti invitiamo a non utilizzare il Servizio.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">2. Descrizione del Servizio</h2>
          <p>Serenity è un'applicazione di supporto al benessere mentale che utilizza l'intelligenza artificiale per offrire conversazioni, monitoraggio dell'umore e strumenti di riflessione personale. <strong>Non è un dispositivo medico</strong> e non sostituisce il parere di professionisti sanitari.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">3. Disclaimer Medico</h2>
          <p>Il Servizio <strong>non fornisce diagnosi, trattamenti o prescrizioni mediche</strong>. In caso di emergenza psicologica, contattare il 112 o il Telefono Amico (02 2327 2327).</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">4. Account e Responsabilità</h2>
          <p>Sei responsabile della sicurezza del tuo account. Non condividere le tue credenziali. L'uso del Servizio è personale e non trasferibile.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">5. Proprietà Intellettuale</h2>
          <p>Tutti i contenuti, design e funzionalità del Servizio sono di proprietà di Serenity. I tuoi dati personali rimangono di tua proprietà.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">6. Abbonamenti e Pagamenti</h2>
          <p>Alcune funzionalità richiedono un abbonamento premium. I pagamenti sono gestiti tramite piattaforme di terze parti sicure. Puoi annullare in qualsiasi momento.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">7. Cancellazione</h2>
          <p>Puoi eliminare il tuo account e tutti i dati associati in qualsiasi momento dalle impostazioni Privacy dell'app.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">8. Modifiche ai Termini</h2>
          <p>Ci riserviamo il diritto di modificare questi termini. Le modifiche saranno comunicate tramite l'app.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">9. Contatti</h2>
          <p>Per domande sui Termini, contattaci a: <span className="text-primary">support@serenity-app.it</span></p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
