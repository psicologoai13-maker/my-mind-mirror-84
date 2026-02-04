

# Piano: Architettura Ibrida - Cervello Gemini + Voce ElevenLabs ✅ COMPLETATO

## Obiettivo
Mantenere **TUTTA** l'intelligenza di Aria (2500+ righe di istruzioni) cambiando **SOLO** la voce.

## Soluzione: ElevenLabs TTS (Text-to-Speech) invece di Conversational AI

### Architettura Implementata
```
Utente parla → Browser Speech-to-Text → Gemini Flash (TUTTO il cervello) → ElevenLabs TTS → Voce naturale
                                                    ↓
                                       ✅ Mantiene: TUTTE le istruzioni
```

## File Creati/Modificati

| File | Stato |
|------|-------|
| `supabase/functions/elevenlabs-tts/index.ts` | ✅ CREATO |
| `supabase/functions/hybrid-voice-chat/index.ts` | ✅ CREATO |
| `src/hooks/useHybridVoice.tsx` | ✅ CREATO |
| `src/components/voice/ZenVoiceModal.tsx` | ✅ MODIFICATO |

## Risultato

Aria ora ha:
- **100% delle istruzioni cliniche** (via Gemini)
- **66 metriche rilevate**
- **Memoria a lungo termine funzionante**
- **Voce naturale italiana** (Laura - ElevenLabs)

