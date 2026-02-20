import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Privacy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh bg-background">
      <header className="px-6 pt-8 pb-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-display text-xl font-bold text-foreground">Privacy Policy</h1>
      </header>

      <div className="px-6 pb-12 space-y-6 text-sm text-foreground leading-relaxed">
        <p className="text-muted-foreground">Ultimo aggiornamento: 20 Febbraio 2026</p>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">1. Titolare del Trattamento</h2>
          <p>Serenity App — contatto: <span className="text-primary">privacy@serenity-app.it</span></p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">2. Dati Raccolti</h2>
          <p>Raccogliamo i seguenti dati forniti volontariamente dall'utente:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Email e nome (registrazione)</li>
            <li>Check-in giornalieri e note personali</li>
            <li>Trascrizioni delle sessioni con Aria</li>
            <li>Obiettivi, abitudini e metriche di benessere</li>
            <li>Posizione geografica (solo se autorizzata)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">3. Finalità del Trattamento</h2>
          <p>I dati sono utilizzati esclusivamente per:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Personalizzare l'esperienza dell'utente</li>
            <li>Generare analisi e insight sul benessere</li>
            <li>Migliorare la qualità delle risposte AI</li>
            <li>Inviare notifiche (solo se abilitate)</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">4. Condivisione dei Dati</h2>
          <p><strong>Non vendiamo né condividiamo i tuoi dati con terze parti.</strong> L'unica eccezione è la condivisione volontaria con un professionista sanitario tramite il codice di connessione.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">5. Sicurezza</h2>
          <p>I dati sono protetti con crittografia a riposo e in transito. L'accesso è controllato tramite Row Level Security: solo tu puoi vedere i tuoi dati.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">6. Conservazione</h2>
          <p>I dati sono conservati fino alla cancellazione dell'account. Puoi esportare o eliminare tutti i tuoi dati in qualsiasi momento dalla sezione Privacy.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">7. Diritti dell'Utente (GDPR)</h2>
          <p>Hai diritto a:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Accesso ai tuoi dati (esportazione JSON)</li>
            <li>Rettifica dei dati personali</li>
            <li>Cancellazione completa dell'account</li>
            <li>Portabilità dei dati</li>
            <li>Revoca del consenso in qualsiasi momento</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">8. Cookie e Tracciamento</h2>
          <p>Non utilizziamo cookie di tracciamento né strumenti di analytics di terze parti.</p>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold text-base">9. Contatti</h2>
          <p>Per esercitare i tuoi diritti o per domande sulla privacy: <span className="text-primary">privacy@serenity-app.it</span></p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
