
# Piano: Implementazione Sezioni Impostazioni Profilo

## Panoramica

Attualmente la pagina Profilo ha 6 voci nella sezione Impostazioni, ma solo **"Area Terapeutica"** funziona. Questo piano definisce cosa deve contenere ogni sezione e come renderle tutte interattive e funzionali.

---

## Struttura Attuale

| Voce | Stato Attuale | Azione |
|------|---------------|--------|
| Dati personali | `action: null` | Da implementare |
| Notifiche | `action: null` | Da implementare |
| Aspetto | `action: null` | Da implementare |
| Privacy Aria | `action: null` | Da implementare |
| Area Terapeutica | `action: '/profile/clinical'` | Funzionante |
| Aiuto | `action: null` | Da implementare |

---

## Sezioni da Implementare

### 1. Dati Personali (`/profile/personal`)

**Contenuto:**
- **Nome** - Modificabile (attualmente salvato durante onboarding)
- **Email** - Solo visualizzazione (da auth.users, non modificabile direttamente)
- **Anno di nascita** - Modificabile (da onboarding_answers.physicalData.birthYear)
- **Altezza** - Modificabile (da onboarding_answers.physicalData.height)
- **Peso attuale** - Link rapido a body_metrics per aggiornare

**Dati esistenti nel DB:**
- `user_profiles.name`
- `user_profiles.email`
- `user_profiles.onboarding_answers` contiene physicalData

**UI Pattern:**
- Lista di campi editabili inline
- Click su campo apre input/modal per modifica
- Salvataggio immediato con toast conferma

---

### 2. Notifiche (`/profile/notifications`)

**Contenuto:**
- **Reminder Check-in** - Toggle on/off + orario preferito
- **Reminder Sessioni** - Toggle on/off
- **Insight Giornalieri** - Toggle on/off
- **Obiettivi completati** - Toggle on/off
- **Aggiornamenti App** - Toggle on/off

**Note tecniche:**
- Richiede aggiunta colonne al DB (notification_settings JSONB)
- Per notifiche push reali: richiede Capacitor + plugin push (futuro)
- Per ora: preparare UI + salvare preferenze

**Nuova colonna DB:**
```sql
ALTER TABLE user_profiles 
ADD COLUMN notification_settings JSONB DEFAULT '{
  "checkin_reminder": true,
  "checkin_time": "09:00",
  "session_reminder": true,
  "daily_insights": true,
  "goal_completed": true,
  "app_updates": false
}'::jsonb;
```

---

### 3. Aspetto (`/profile/appearance`)

**Contenuto:**
- **Tema** - Light / Dark / Sistema (toggle 3 opzioni)
- **Dimensione Testo** - Normale / Grande (accessibility)
- **Animazioni ridotte** - Toggle per ridurre motion

**Note tecniche:**
- Usa `next-themes` gia installato
- Salva preferenze in localStorage + opzionalmente nel profilo DB

**UI Pattern:**
- Radio buttons per tema
- Toggle per altre opzioni

---

### 4. Privacy Aria (`/profile/privacy`)

**Contenuto:**
- **Condividi posizione** - Toggle (gia esiste in PrivacySettingsCard.tsx)
- **Dati raccolti da Aria** - Info su cosa viene analizzato
- **Esporta i tuoi dati** - Button per download JSON/PDF
- **Elimina tutti i dati** - Button con conferma (danger zone)
- **Termini e Privacy Policy** - Link esterni

**Componente esistente:** `PrivacySettingsCard.tsx` contiene gia il toggle posizione

**UI Pattern:**
- Toggle per permessi
- Sezione info con accordion
- Danger zone in fondo con sfondo rosso leggero

---

### 5. Aiuto (`/profile/help`)

**Contenuto:**
- **FAQ** - Accordion con domande frequenti
- **Come funziona Aria** - Breve spiegazione
- **Contatta supporto** - Email/form
- **Versione app** - Info tecnica
- **Tutorial** - Link per rifare onboarding tour

**UI Pattern:**
- Accordion per FAQ
- Card info per tutorial
- Footer con versione

---

## Approccio Implementativo

### Opzione A: Pagine Separate (Come Area Terapeutica)
Ogni sezione ha la sua pagina dedicata (`/profile/personal`, `/profile/notifications`, etc.)

**Pro:** Navigazione pulita, piu spazio per contenuti
**Contro:** Piu file da creare

### Opzione B: Sheet/Modal (Raccomandato)
Ogni sezione si apre come Sheet dal basso (gia usato per gestione habits)

**Pro:** Navigazione veloce, meno route, UX mobile-first
**Contro:** Contenuti limitati in altezza

### Decisione: **Ibrido**
- Sezioni semplici (Aspetto, Notifiche): **Sheet**
- Sezioni complesse (Dati personali, Privacy, Aiuto): **Pagine separate**

---

## File da Creare

| File | Tipo | Descrizione |
|------|------|-------------|
| `src/pages/ProfilePersonal.tsx` | Pagina | Modifica dati personali |
| `src/pages/ProfilePrivacy.tsx` | Pagina | Gestione privacy e dati |
| `src/pages/ProfileHelp.tsx` | Pagina | FAQ e supporto |
| `src/components/profile/NotificationsSheet.tsx` | Sheet | Toggle notifiche |
| `src/components/profile/AppearanceSheet.tsx` | Sheet | Tema e accessibilita |

---

## File da Modificare

| File | Modifica |
|------|----------|
| `src/pages/Profile.tsx` | Aggiornare settingsItems con azioni corrette, aggiungere state per Sheet |
| `src/App.tsx` | Aggiungere nuove route |
| `src/hooks/useProfile.tsx` | Aggiungere notification_settings al tipo |

---

## Dettaglio UI per Sezione

### Dati Personali (Pagina)

```
┌─────────────────────────────────────────┐
│ ← Dati Personali                        │
├─────────────────────────────────────────┤
│                                         │
│  👤 Nome                                │
│  ┌─────────────────────────────────┐   │
│  │ Marco                        ✏️  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📧 Email                               │
│  ┌─────────────────────────────────┐   │
│  │ marco@email.com           🔒    │   │
│  └─────────────────────────────────┘   │
│  (Non modificabile)                     │
│                                         │
│  📅 Anno di nascita                     │
│  ┌─────────────────────────────────┐   │
│  │ 1990                         ✏️  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📏 Altezza                             │
│  ┌─────────────────────────────────┐   │
│  │ 175 cm                       ✏️  │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Notifiche (Sheet)

```
┌─────────────────────────────────────────┐
│              Notifiche                  │
├─────────────────────────────────────────┤
│                                         │
│  🔔 Reminder Check-in          [ON ]   │
│     Ogni giorno alle 09:00              │
│                                         │
│  💬 Reminder Sessioni          [ON ]   │
│                                         │
│  ✨ Insight Giornalieri        [OFF]   │
│                                         │
│  🎯 Obiettivi completati       [ON ]   │
│                                         │
│  📱 Aggiornamenti App          [OFF]   │
│                                         │
└─────────────────────────────────────────┘
```

### Aspetto (Sheet)

```
┌─────────────────────────────────────────┐
│               Aspetto                   │
├─────────────────────────────────────────┤
│                                         │
│  🎨 Tema                                │
│  ┌───────┬───────┬───────┐             │
│  │ ☀️    │ 🌙    │ 📱    │             │
│  │ Light │ Dark  │ Auto  │             │
│  └───────┴───────┴───────┘             │
│                                         │
│  Aa Testo Grande            [OFF]      │
│                                         │
│  🎭 Riduci animazioni       [OFF]      │
│                                         │
└─────────────────────────────────────────┘
```

### Privacy (Pagina)

```
┌─────────────────────────────────────────┐
│ ← Privacy Aria                          │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🛡️ I tuoi dati sono protetti   │   │
│  │ Solo tu hai accesso ai tuoi    │   │
│  │ dati. Aria non condivide nulla │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📍 Condividi posizione      [OFF]     │
│     Aria contestualizza meteo           │
│                                         │
│  📊 Cosa raccoglie Aria         ▼      │
│  (Accordion espandibile)                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📥 Esporta i tuoi dati         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ⚠️ Zona Pericolosa                    │
│  ┌─────────────────────────────────┐   │
│  │ 🗑️ Elimina tutti i dati        │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📄 Termini di Servizio                 │
│  🔐 Privacy Policy                      │
│                                         │
└─────────────────────────────────────────┘
```

### Aiuto (Pagina)

```
┌─────────────────────────────────────────┐
│ ← Aiuto                                 │
├─────────────────────────────────────────┤
│                                         │
│  ❓ Domande Frequenti                   │
│  ┌─────────────────────────────────┐   │
│  │ Come funziona Aria?          ▼  │   │
│  ├─────────────────────────────────┤   │
│  │ I miei dati sono sicuri?     ▼  │   │
│  ├─────────────────────────────────┤   │
│  │ Come guadagno punti?         ▼  │   │
│  ├─────────────────────────────────┤   │
│  │ Posso connettere il medico?  ▼  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📚 Tutorial                            │
│  ┌─────────────────────────────────┐   │
│  │ 🎓 Rifai il tour introduttivo   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  💬 Contatta Supporto                   │
│  ┌─────────────────────────────────┐   │
│  │ 📧 support@aria.app            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│  Aria v1.0.0                            │
│  Made with 💚                           │
│                                         │
└─────────────────────────────────────────┘
```

---

## Migrazione Database

```sql
-- Aggiungere colonna per preferenze notifiche
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "checkin_reminder": true,
  "checkin_time": "09:00",
  "session_reminder": true,
  "daily_insights": true,
  "goal_completed": true,
  "app_updates": false
}'::jsonb;

-- Aggiungere colonna per preferenze aspetto
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS appearance_settings JSONB DEFAULT '{
  "theme": "system",
  "large_text": false,
  "reduce_motion": false
}'::jsonb;
```

---

## Sequenza Implementazione

### Fase 1: Struttura Base
1. Creare migrazione DB per nuove colonne
2. Aggiornare tipo UserProfile nel hook
3. Creare componenti Sheet per Notifiche e Aspetto
4. Aggiornare Profile.tsx con state per Sheet

### Fase 2: Pagine Dedicate
5. Creare `/profile/personal` con form editabili
6. Creare `/profile/privacy` con toggle e danger zone
7. Creare `/profile/help` con FAQ accordion
8. Aggiungere route in App.tsx

### Fase 3: Funzionalita
9. Implementare logica salvataggio per ogni sezione
10. Aggiungere toast feedback
11. Implementare export dati (JSON)
12. Aggiungere conferma per delete dati

### Fase 4: Polish
13. Animazioni e transizioni
14. Test su tutti i flussi
15. Accessibilita (focus trap nei modal)

---

## Risultato Finale

Tutte le 6 voci delle Impostazioni saranno cliccabili e funzionali:

| Voce | Tipo | Funzionalita |
|------|------|--------------|
| Dati personali | Pagina | Modifica nome, anno nascita, altezza |
| Notifiche | Sheet | Toggle preferenze notifiche |
| Aspetto | Sheet | Tema + accessibilita |
| Privacy Aria | Pagina | Posizione, export, delete dati |
| Area Terapeutica | Pagina | Esistente, gia funzionante |
| Aiuto | Pagina | FAQ, supporto, versione |
