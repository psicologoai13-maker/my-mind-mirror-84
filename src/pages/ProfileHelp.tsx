import React from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { ArrowLeft, HelpCircle, BookOpen, Mail, Heart, ExternalLink } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Come funziona Aria?',
    answer: 'Aria è la tua compagna di benessere digitale. Puoi parlare con lei via chat o voce per esprimere come ti senti. Aria analizza le tue emozioni e ti aiuta a comprendere meglio te stesso attraverso insights personalizzati e tracking delle tue abitudini.'
  },
  {
    question: 'I miei dati sono sicuri?',
    answer: 'Assolutamente sì. Tutti i tuoi dati sono criptati e accessibili solo a te. Non condividiamo informazioni con terze parti. Puoi esportare o eliminare i tuoi dati in qualsiasi momento dalla sezione Privacy.'
  },
  {
    question: 'Come guadagno punti?',
    answer: 'Guadagni punti completando check-in giornalieri (10 punti), finendo sessioni con Aria (25 punti), raggiungendo obiettivi (50 punti) e mantenendo streak consecutive. Puoi anche guadagnare 400 punti invitando amici!'
  },
  {
    question: 'Posso connettere il mio terapeuta?',
    answer: 'Sì! Dalla sezione "Area Terapeutica" nel profilo puoi generare un codice di connessione. Il tuo terapeuta può usarlo per visualizzare (in sola lettura) i tuoi progressi e aiutarti meglio durante le sedute.'
  },
  {
    question: 'Aria sostituisce un terapeuta?',
    answer: 'No, Aria non è un sostituto per la terapia professionale. È uno strumento di supporto al benessere quotidiano. Se senti di aver bisogno di aiuto professionale, ti consigliamo di rivolgerti a uno psicologo o psicoterapeuta.'
  },
  {
    question: 'Come funziona Aria Plus?',
    answer: 'Aria Plus sblocca funzionalità premium come sessioni vocali illimitate, analisi avanzate e accesso prioritario a nuove funzionalità. Puoi abbonarti dalla pagina Plus o guadagnare 1 mese gratis raggiungendo 1000 punti.'
  },
];

const ProfileHelp: React.FC = () => {
  const navigate = useNavigate();

  return (
    <MobileLayout hideNav>
      <header className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/profile')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold text-foreground">Aiuto</h1>
        </div>
      </header>

      <div className="px-6 space-y-5 pb-8">
        {/* FAQ Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Domande Frequenti</h2>
          </div>
          
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border-b border-border/30 last:border-0"
                >
                  <AccordionTrigger className="px-4 py-4 text-left text-sm font-medium hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Tutorial Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Tutorial</h2>
          </div>
          
          <button 
            className="w-full bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between hover:bg-muted/50 transition-colors"
            onClick={() => {
              // TODO: Implement tutorial restart
              navigate('/onboarding');
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🎓</span>
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Rifai il tour introduttivo</p>
                <p className="text-xs text-muted-foreground">Rivedi come funziona Aria</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Support Section */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Mail className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Contatta Supporto</h2>
          </div>
          
          <a 
            href="mailto:support@aria.app"
            className="w-full bg-card rounded-2xl p-4 border border-border/50 flex items-center justify-between hover:bg-muted/50 transition-colors block"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">support@aria.app</p>
                <p className="text-xs text-muted-foreground">Rispondiamo entro 24h</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        {/* Footer */}
        <div className="pt-8 text-center space-y-2">
          <div className="h-px bg-border/50 mb-6" />
          <p className="text-sm text-muted-foreground">
            Aria v1.0.0
          </p>
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> in Italia
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ProfileHelp;
