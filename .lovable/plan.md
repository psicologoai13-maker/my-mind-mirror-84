
# Redesign Profilo: Layout Compatto e UX Ottimizzata

## Problemi Attuali

### Spazio Sprecato
1. **Header card troppo alta** - Contiene nome, badge, punti, stats, badges, AND "Guadagna Punti" collapsible
2. **Premium Card separata** - Duplica info gia presente nel badge "Free/Plus"
3. **Punti mostrati 2 volte** - Nell'header E nel PointsProgressCard
4. **7 settings items** - Lista molto lunga con padding eccessivo (py-4 per ogni item)

### UX Confusa
5. **"Guadagna Punti" nascosto** - Richiede tap extra per vedere streak/referral
6. **Stats sparsi** - Streak, sessioni, punti in posti diversi
7. **Badge floating** - Senza una sezione chiara
8. **Settings button inutile** - In alto a destra ma non fa nulla

---

## Nuovo Design: Layout Verticale Ottimizzato

```text
+------------------------------------------+
|  HEADER COMPATTO                          |
|  +------+  Nome Utente                    |
|  | 👤  |  🔥 12 giorni • 💬 24 sessioni  |
|  +------+  💎 850 punti                   |
+------------------------------------------+
|  PROGRESS STREAK (inline, sempre visibile)|
|  [=========>         ] 12/30 giorni       |
|  +150 pts al prossimo traguardo           |
+------------------------------------------+
|  PREMIUM CTA (solo se Free, compatto)     |
|  ✨ Passa a Plus • €4.99/mese  [Scopri >] |
+------------------------------------------+
|  IMPOSTAZIONI (gruppi compatti)           |
|  👤 Account                               |
|     Dati personali • Interessi            |
|  ⚙️ Preferenze                            |
|     Notifiche • Aspetto • Privacy         |
|  🏥 Salute                                |
|     Area Terapeutica                      |
|  ❓ Supporto                              |
|     Aiuto • Invita amici (+400 pts)       |
+------------------------------------------+
|  [Esci]                                   |
+------------------------------------------+
```

---

## Modifiche Tecniche

### 1. Profile.tsx - Nuovo Layout Compatto

**Header semplificato:**
- Avatar placeholder con iniziali (o emoji)
- Nome + badge Premium inline
- Stats in una riga: streak, sessioni, punti

**Streak Progress inline:**
- Barra progresso sempre visibile (non collapsible)
- Mostra giorni correnti e punti al prossimo milestone

**Premium CTA condizionale:**
- Solo se utente Free
- Una riga con prezzo e CTA

**Settings raggruppati:**
- 4 gruppi invece di 7 items separati
- Padding ridotto (py-2.5 invece di py-4)
- Items inline dove possibile

### 2. Componenti Eliminati/Semplificati

| Componente | Azione |
|------------|--------|
| `PointsProgressCard` | Inline nel header (no collapse) |
| `PremiumCard` | Ridotto a 1 riga CTA |
| `ProfileBadgesRow` | Spostato in sottopagina |
| `ProfileStatsRow` | Inline sotto nome |

### 3. Nuovo ProfileCompactHeader Component

```tsx
// Combina: nome, stats, streak progress
- Avatar con iniziali o emoji
- Nome + badge plan
- Stats row: 🔥 streak | 💬 sessions | 💎 points
- Progress bar streak (always visible)
```

### 4. Settings Grouped Component

```tsx
// 4 gruppi con header + items compatti
const settingsGroups = [
  {
    label: 'Account',
    icon: '👤',
    items: [
      { label: 'Dati personali', action: '/profile/personal' },
      { label: 'Interessi', action: '/profile/interests' },
    ]
  },
  {
    label: 'Preferenze',
    icon: '⚙️',
    items: [
      { label: 'Notifiche', action: 'notifications' },
      { label: 'Aspetto', action: 'appearance' },
      { label: 'Privacy', action: '/profile/privacy' },
    ]
  },
  {
    label: 'Salute',
    icon: '🏥',
    items: [
      { label: 'Area Terapeutica', action: '/profile/clinical' },
    ]
  },
  {
    label: 'Supporto',
    icon: '❓',
    items: [
      { label: 'Aiuto', action: '/profile/help' },
      { label: 'Invita amici', action: 'referral', badge: '+400' },
    ]
  }
];
```

---

## File da Modificare

### `src/pages/Profile.tsx`
- Rimuovere `<PremiumCard />` separata
- Rimuovere `<PointsProgressCard compact />` collapsible
- Implementare nuovo layout con sezioni inline
- Ridurre padding globale (space-y-4 invece di space-y-5)

### `src/components/profile/ProfileCompactHeader.tsx` (nuovo)
- Avatar con iniziali
- Nome + badge inline
- Stats row compatta
- Streak progress sempre visibile
- Referral code inline (opzionale)

### `src/components/profile/SettingsGroupList.tsx` (nuovo)
- Settings raggruppati per categoria
- Items compatti con padding ridotto
- Badge per azioni speciali (es. +400 pts referral)

### `src/components/profile/CompactPremiumBanner.tsx` (nuovo)
- Una riga: icona + testo + prezzo + CTA
- Solo visibile se utente Free
- Stile gradient subtle

---

## Stima Risparmio Spazio

| Sezione | Prima | Dopo | Risparmio |
|---------|-------|------|-----------|
| Header card | ~200px | ~120px | 40% |
| Premium card | ~180px | ~50px | 72% |
| Settings | ~400px | ~280px | 30% |
| **Totale** | ~780px | ~450px | **42%** |

---

## Vantaggi UX

1. **Tutto visibile** - No collapse, no tap extra
2. **Hierarchy chiara** - Gruppi logici per settings
3. **Focus su azioni** - CTA Premium e referral prominenti
4. **Consistenza** - Stile Liquid Glass unificato
5. **Mobile-first** - Ottimizzato per thumb-zone
