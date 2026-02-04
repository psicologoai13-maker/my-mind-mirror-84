

# Piano: Sostituire SOLO la Voce di Gemini con Carla

## Problema

`useGeminiVoice` funzionava perfettamente su iOS e desktop con tutta l'intelligenza di Aria intatta. L'unico difetto era la voce robotica del modello `gemini-2.5-flash-preview-native-audio-dialog`.

## Soluzione Minima

Modificare `useGeminiVoice` per:
1. **MANTENERE** l'input audio via Gemini (STT + VAD funzionanti)
2. **MANTENERE** tutta l'intelligenza di Aria (prompt completo)
3. **IGNORARE** l'audio di risposta di Gemini
4. **USARE** il testo della risposta per generare audio con ElevenLabs TTS (voce Carla)

## Architettura Prima/Dopo

```text
PRIMA (voce robotica):
Utente parla → Gemini STT → Gemini Brain → Gemini Audio → Utente sente (robotico)

DOPO (voce Carla):
Utente parla → Gemini STT → Gemini Brain → ElevenLabs TTS → Utente sente (Carla)
```

## Modifiche Tecniche

### File Modificato

| File | Modifica |
|------|----------|
| `src/hooks/useGeminiVoice.tsx` | Ignorare audio Gemini, chiamare ElevenLabs TTS con il testo |

### Dettaglio Modifiche

Nel blocco che gestisce `serverContent.modelTurn.parts`:

**Prima** (riproduce audio Gemini):
```typescript
if (part.inlineData?.mimeType?.includes('audio') && part.inlineData?.data) {
  setIsSpeaking(true);
  const audioData = pcm16Base64ToFloat32(part.inlineData.data);
  workletNodeRef.current.port.postMessage({ samples: Array.from(audioData) });
}
```

**Dopo** (usa ElevenLabs TTS):
```typescript
// Ignoriamo l'audio di Gemini, usiamo solo il testo
if (part.text) {
  currentAssistantTextRef.current += part.text;
}

// Quando turnComplete, convertiamo il testo in audio con ElevenLabs
if (serverContent.turnComplete && currentAssistantTextRef.current) {
  setIsSpeaking(true);
  const ttsResponse = await fetch('/functions/v1/elevenlabs-tts', {
    body: JSON.stringify({ text: currentAssistantTextRef.current })
  });
  const ttsData = await ttsResponse.json();
  playAudioBlob(ttsData.audioContent); // Voce Carla!
}
```

### Componente UI

| File | Modifica |
|------|----------|
| `src/components/voice/ZenVoiceModal.tsx` | Cambiare import da `useHybridVoice` a `useGeminiVoice` |

## Cosa Rimane Intatto

- STT di Gemini (funziona su iOS via WebSocket)
- VAD di Gemini (rileva automaticamente fine frase)
- Prompt completo di Aria (2500+ righe)
- Memoria a lungo termine
- Contesto in tempo reale (meteo, data, ecc.)
- Protocolli clinici (CBT, DBT, ACT, ecc.)
- Data Hunter (raccolta dati aree vita)
- Salvataggio sessione e analisi

## Cosa Cambia

| Aspetto | Prima | Dopo |
|---------|-------|------|
| **Voce** | Gemini (robotica) | Carla (naturale) |
| **STT** | Gemini | Gemini (invariato) |
| **Brain** | Gemini | Gemini (invariato) |
| **iOS** | Funziona | Funziona |

## Vantaggi

- Modifica minima (poche righe di codice)
- Nessun rischio di perdere funzionalita
- iOS continua a funzionare
- Voce naturale italiana
- Nessuna nuova edge function necessaria (ElevenLabs TTS esiste gia)

## Note

La edge function `elevenlabs-tts` e gia configurata con la voce Carla (ID: `litDcG1avVppv4R90BLu`).

