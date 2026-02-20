
# Analisi Completa Pre-Lancio: Serenity / Aria

## Stato Attuale dell'App

L'app e' funzionalmente ricca con un ecosistema completo: chat AI, voice, check-in, analisi, obiettivi, diari tematici, sistema premium, doctor dashboard. Tuttavia, ci sono diverse aree critiche da sistemare prima del lancio.

---

## PROBLEMI CRITICI (Bloccanti per il Lancio)

### 1. Nessun "Password Dimenticata"
La pagina Auth non ha alcun meccanismo di recupero password. Un utente che dimentica la password non puo' piu' accedere.

**Soluzione:** Aggiungere link "Password dimenticata?" che invoca `supabase.auth.resetPasswordForEmail()` con redirect a una pagina di reset.

### 2. Nessun Error Boundary
Se un componente React crasha, l'intera app diventa bianca senza feedback. Nessun `ErrorBoundary` e' implementato.

**Soluzione:** Creare un `ErrorBoundary` globale che mostri un messaggio user-friendly con opzione di ricaricare.

### 3. Chat: Riferimento Legacy a `long_term_memory`
`Chat.tsx` (riga 66) ancora legge `profile?.long_term_memory` per mostrare il badge memoria nell'header. Dopo la migrazione a `user_memories`, questo array non viene piu' aggiornato, quindi il badge mostra dati obsoleti o "Nuova".

**Soluzione:** Sostituire con una query a `user_memories` (conteggio memorie attive) per mostrare il numero reale di ricordi.

### 4. Termini di Servizio e Privacy Policy non funzionanti
I link "Termini di Servizio" e "Privacy Policy" nella pagina Auth sono `<span>` senza `href` ne' `onClick`. Cliccandoli non succede nulla.

**Soluzione:** Creare pagine `/terms` e `/privacy` con contenuto legale, oppure linkare a URL esterni.

### 5. Pagina Plus: Pagamenti Non Implementati
Il bottone "Abbonati" mostra solo un toast "Pagamenti in arrivo presto!". Per il lancio serve almeno una soluzione funzionante.

**Soluzione:** Integrare Stripe per pagamenti reali, oppure rimuovere la sezione abbonamento e mantenere solo il riscatto punti.

---

## PROBLEMI IMPORTANTI (Alta Priorita')

### 6. Nessun Social Login (Google)
Solo email/password. Google Sign-In e' ormai standard e riduce drasticamente la friction di registrazione.

**Soluzione:** Abilitare Google OAuth tramite il sistema di autenticazione, aggiungere bottone "Continua con Google".

### 7. Auth: Nessuna Conferma Email Visibile
Dopo la registrazione, l'utente non vede un messaggio chiaro che deve verificare l'email. Il flusso post-signup e' confuso.

**Soluzione:** Dopo `signUp`, mostrare una schermata "Controlla la tua email" con istruzioni chiare.

### 8. Sessioni: Paginazione Assente
`Sessions.tsx` mostra solo le prime 8 sessioni con un bottone "Mostra altre" che non fa nulla (`<button>` senza handler).

**Soluzione:** Implementare la paginazione o "load more" funzionante.

### 9. ProfilePrivacy: Link Privacy Policy Non Funzionante
Il bottone "Privacy Policy" nella pagina privacy non ha un `onClick` handler.

### 10. Nessun Feedback di Rate Limiting
Le Edge Functions hanno rate limiting ma il feedback all'utente e' generico. Servono messaggi piu' chiari.

---

## MIGLIORAMENTI UX (Media Priorita')

### 11. Splash Screen / Loading State Migliorato
Lo screenshot mostra che la pagina Auth ha un momento "bianco" durante il caricamento delle animazioni. Serve un loading state piu' fluido.

### 12. Onboarding: Manca Step "Conferma Dati"
L'onboarding salta direttamente dalla selezione interessi alla schermata "Ready". Un riepilogo dei dati inseriti migliorerebbe la fiducia dell'utente.

### 13. Home: Messaggio Personalizzato per Ora del Giorno
"Come ti senti oggi?" e' statico. Personalizzarlo con l'ora (Buongiorno/Buon pomeriggio/Buonasera) e con dati contestuali.

### 14. Analisi: Sezione Correlazioni e Pattern
Le tabelle `user_correlations` e `emotion_patterns` sono popolate dalle Edge Functions ma non c'e' nessun componente UI per visualizzarle. L'utente non vede mai questi dati.

**Soluzione:** Aggiungere sezione "Insight Personali" nella pagina Analisi con:
- Card correlazioni ("Il sonno migliora il tuo umore del 40%")  
- Card pattern ("Noto che i lunedi' sono piu' difficili per te")

### 15. Pull-to-Refresh
Nessuna pagina supporta pull-to-refresh, un pattern mobile fondamentale.

---

## MIGLIORAMENTI TECNICI (Bassa Priorita')

### 16. Service Worker / PWA
L'app non ha un service worker. Per un'esperienza mobile ottimale, servirebbero:
- Caching offline delle pagine
- Manifest.json per installazione
- Push notifications (preparazione)

### 17. Cleanup Dati Legacy
La colonna `long_term_memory` in `user_profiles` non e' piu' usata dopo la migrazione a `user_memories`. Andrebbe rimossa o ignorata esplicitamente.

### 18. Accessibilita' (a11y)
- Mancano `aria-label` su molti bottoni icon-only
- Il contrasto dei testi `text-muted-foreground` potrebbe non superare WCAG AA su sfondi chiari
- Manca `role="alert"` sui messaggi di errore

---

## PIANO DI IMPLEMENTAZIONE PROPOSTO

### Fase 1: Bloccanti (1-2 iterazioni)
1. Aggiungere "Password dimenticata" alla pagina Auth
2. Creare ErrorBoundary globale
3. Fixare badge memoria in Chat.tsx (query `user_memories`)
4. Creare pagine Terms/Privacy o link esterni
5. Decidere strategia pagamenti (Stripe o rimuovere sezione)

### Fase 2: Alta Priorita' (2-3 iterazioni)
6. Schermata "Controlla email" post-registrazione
7. Fix paginazione sessioni
8. Fix link Privacy Policy in ProfilePrivacy
9. Aggiungere Google OAuth (opzionale)

### Fase 3: UX Polish (2-3 iterazioni)
10. Saluto personalizzato per ora del giorno
11. Sezione Correlazioni e Pattern nella pagina Analisi
12. Pull-to-refresh sulle pagine principali

### Fase 4: Tecnico (1-2 iterazioni)
13. Error Boundary con reporting
14. Cleanup `long_term_memory` column
15. Miglioramenti a11y di base

---

## Dettaglio Tecnico

### Password Reset
```text
// In Auth.tsx, aggiungere sotto il form:
<button onClick={handleForgotPassword}>Password dimenticata?</button>

// Handler:
const handleForgotPassword = async () => {
  if (!email) { toast.error('Inserisci la tua email'); return; }
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth?type=recovery`
  });
  if (!error) toast.success('Email di recupero inviata!');
};
```

### ErrorBoundary
```text
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <ErrorFallbackUI />;
    return this.props.children;
  }
}
// Wrappare in App.tsx: <ErrorBoundary><BrowserRouter>...</BrowserRouter></ErrorBoundary>
```

### Fix Badge Memoria Chat
```text
// Chat.tsx - sostituire riga 66-70 con:
const { data: memoryCount } = useQuery({
  queryKey: ['memory-count', user?.id],
  queryFn: async () => {
    const { count } = await supabase
      .from('user_memories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true);
    return count || 0;
  },
  enabled: !!user?.id,
});
const hasMemory = (memoryCount || 0) > 0;
```

### UI Correlazioni (Analisi)
```text
// Nuovo componente: src/components/analisi/CorrelationsInsightSection.tsx
// Query user_correlations WHERE is_significant = true
// Mostra card con insight_text e strength indicator
// Query emotion_patterns WHERE is_active = true
// Mostra card con description e recommendations
```

---

## Riepilogo Priorita'

| # | Issue | Tipo | Impatto Lancio |
|---|-------|------|----------------|
| 1 | Password dimenticata | Critico | Bloccante |
| 2 | ErrorBoundary | Critico | Bloccante |
| 3 | Badge memoria legacy | Bug | Alto |
| 4 | Terms/Privacy links | Legale | Bloccante |
| 5 | Pagamenti Plus | Business | Alto |
| 6 | Conferma email UX | UX | Alto |
| 7 | Paginazione sessioni | Bug | Medio |
| 8 | Correlazioni UI | Feature | Medio |
| 9 | Saluto personalizzato | UX | Basso |
| 10 | Google OAuth | Feature | Medio |
