

# Piano: Riparazione Chat Obiettivi e Diari

## Problema Identificato

Tre funzionalità non funzionano per motivi diversi:

1. **"Aggiorna Obiettivi"** - Mostra "Ops, qualcosa è andato storto" perchè la funzione backend usa OpenAI API con quota esaurita
2. **"Nuovo Obiettivo"** e **"Chat Diari"** - Le funzioni backend non sono deployate (errore 404)

## Soluzione

### Fase 1: Migrare `update-objective-chat` a Lovable AI Gateway

La funzione usa ancora OpenAI direttamente (`api.openai.com`) invece di Lovable AI Gateway. Devo:

- Rimuovere l'uso di `OPENAI_API_KEY`
- Cambiare l'endpoint a `ai.gateway.lovable.dev`
- Usare `LOVABLE_API_KEY` (già configurato)
- Cambiare modello da `gpt-4o-mini` a `google/gemini-2.5-flash`
- Aggiornare import Supabase da `esm.sh` a `npm:` per stabilità

### Fase 2: Stabilizzare `thematic-diary-chat`

- Cambiare import Supabase da `esm.sh` a `npm:@supabase/supabase-js@2` per evitare timeout di deployment

### Fase 3: Deploy di tutte le funzioni

- `create-objective-chat` (già usa Lovable AI Gateway)
- `update-objective-chat` (dopo migrazione)
- `thematic-diary-chat` (dopo fix import)

## Modifiche Tecniche

### `update-objective-chat/index.ts`

```text
PRIMA (linee 1-3):
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

DOPO:
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
```

```text
PRIMA (linee 65-68):
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
if (!openaiApiKey) {
  throw new Error('OpenAI API key not configured');
}

DOPO:
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
if (!LOVABLE_API_KEY) {
  throw new Error('LOVABLE_API_KEY not configured');
}
```

```text
PRIMA (linee 136-151):
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  ...
  headers: { 'Authorization': `Bearer ${openaiApiKey}` },
  body: JSON.stringify({ model: 'gpt-4o-mini', ... }),
});

DOPO:
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  ...
  headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: 'google/gemini-2.5-flash', ... }),
});
```

### `thematic-diary-chat/index.ts`

```text
PRIMA (linea 2):
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

DOPO:
import { createClient } from "npm:@supabase/supabase-js@2";
```

## Risultato Atteso

- "Aggiorna Progressi" funzionerà senza errori di quota
- "Nuovo Obiettivo" chat funzionerà
- "Chat Diari" (Amore, Lavoro, Relazioni, Me Stesso) funzioneranno
- Tutte le funzioni useranno Lovable AI Gateway (nessuna dipendenza da API key esterne)

