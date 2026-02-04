

# Piano: Architettura Ibrida - Cervello Gemini + Voce ElevenLabs

## Obiettivo
Mantenere **TUTTA** l'intelligenza di Aria (2500+ righe di istruzioni) cambiando **SOLO** la voce.

## Soluzione: ElevenLabs TTS (Text-to-Speech) invece di Conversational AI

### Architettura Attuale (Problematica)
```
Utente parla → ElevenLabs Agent (suo LLM limitato) → Voce ElevenLabs
                         ↓
              ❌ Perso: 2500 righe di istruzioni cliniche
```

### Nuova Architettura (Proposta)
```
Utente parla → Browser Speech-to-Text → Gemini Flash (TUTTO il cervello) → ElevenLabs TTS → Voce naturale
                                                    ↓
                                       ✅ Mantiene: TUTTE le istruzioni
```

## Flusso Tecnico Dettagliato

1. **Input Vocale**: Browser Web Speech API (gratuito, built-in)
2. **Elaborazione**: Gemini 2.5 Flash con il system prompt COMPLETO (2500+ righe)
3. **Output Vocale**: ElevenLabs Text-to-Speech API (solo sintesi vocale)

## Vantaggi
- **100% delle istruzioni cliniche** mantenute
- **66 metriche** rilevate come prima
- **Memoria a lungo termine** funzionante
- **Knowledge base** completa
- **Voce naturale italiana** di ElevenLabs (es. Laura, Alice, Carla)

## File da Creare/Modificare

| File | Azione |
|------|--------|
| `supabase/functions/elevenlabs-tts/index.ts` | **NUOVO**: Edge function per convertire testo in voce |
| `src/hooks/useHybridVoice.tsx` | **NUOVO**: Hook che combina Speech-to-Text + Gemini + ElevenLabs TTS |
| `src/components/voice/ZenVoiceModal.tsx` | **MODIFICA**: Usare il nuovo hook ibrido |

## Implementazione Edge Function (ElevenLabs TTS)

```typescript
// supabase/functions/elevenlabs-tts/index.ts
// Converte testo in audio usando voce italiana naturale
const response = await fetch(
  `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
  {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: ariaResponse,
      model_id: "eleven_multilingual_v2", // Supporto italiano nativo
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    }),
  }
);
```

## Implementazione Hook Ibrido

```typescript
// src/hooks/useHybridVoice.tsx
// 1. Web Speech API per speech-to-text (input utente)
// 2. Chiamata a gemini-voice con TUTTO il contesto
// 3. Risposta testuale → ElevenLabs TTS per voce naturale
```

## Voci Italiane Disponibili (ElevenLabs)

- **Laura** (FGY2WhTYpPnrIDTdsKH5) - Femminile, calda
- **Alice** (Xb7hH8MSUJpSbSDYk0k2) - Femminile, naturale
- Oppure voce personalizzata configurata nell'agente

## Confronto Approcci

| Aspetto | ElevenLabs Agent (attuale) | Ibrido Gemini+TTS (proposto) |
|---------|---------------------------|------------------------------|
| Cervello | LLM ElevenLabs (limitato) | Gemini Flash (completo) |
| Istruzioni | ~500 caratteri max | 2500+ righe |
| 66 Metriche | ❌ Perse | ✅ Tutte |
| Memoria | ❌ Limitata | ✅ Completa |
| Knowledge Base | ❌ Minima | ✅ Enciclopedia completa |
| Voce | ✅ Naturale | ✅ Naturale (stesso livello) |

## Risultato Finale

Dopo l'implementazione:
- Aria avrà **ESATTAMENTE** lo stesso cervello di prima
- Rileverà le **66 metriche** come sempre
- Userà **tutte le tecniche cliniche** (CBT, DBT, MI, ACT, SFBT)
- Ricorderà le **sessioni precedenti**
- Avrà **voce naturale italiana** di qualità ElevenLabs

La differenza sarà **SOLO** la qualità della voce, più naturale e umana.

