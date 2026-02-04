import { useConversation } from "@elevenlabs/react";
import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealTimeContext } from "./useRealTimeContext";
import { toast } from "sonner";

export type ElevenLabsStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface UseElevenLabsVoiceReturn {
  isActive: boolean;
  isConnecting: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  audioLevel: number;
  status: ElevenLabsStatus;
  error: string | null;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export const useElevenLabsVoice = (): UseElevenLabsVoiceReturn => {
  const [status, setStatus] = useState<ElevenLabsStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioLevelInterval = useRef<NodeJS.Timeout | null>(null);
  const { context } = useRealTimeContext();

  const conversation = useConversation({
    onConnect: () => {
      console.log("✅ ElevenLabs connected");
      setStatus('connected');
      setError(null);
      toast.success("Connessa con Aria!");
    },
    onDisconnect: () => {
      console.log("🔌 ElevenLabs disconnected");
      setStatus('idle');
      setAudioLevel(0);
    },
    onMessage: (message) => {
      console.log("📨 ElevenLabs message:", message);
    },
    onError: (err) => {
      console.error("❌ ElevenLabs error:", err);
      setError(err.message || "Errore di connessione");
      setStatus('error');
      toast.error("Errore nella connessione vocale");
    },
  });

  // Track audio levels for visualization
  useEffect(() => {
    if (status === 'connected') {
      audioLevelInterval.current = setInterval(() => {
        const inputLevel = conversation.getInputVolume();
        const outputLevel = conversation.getOutputVolume();
        const level = Math.max(inputLevel, outputLevel);
        setAudioLevel(level);
      }, 50);
    } else {
      if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current);
        audioLevelInterval.current = null;
      }
      setAudioLevel(0);
    }

    return () => {
      if (audioLevelInterval.current) {
        clearInterval(audioLevelInterval.current);
      }
    };
  }, [status, conversation]);

  const start = useCallback(async () => {
    setStatus('connecting');
    setError(null);

    try {
      // Request microphone permission first
      console.log("🎤 Requesting microphone permission...");
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone permission granted");

      // Get signed URL and system prompt from edge function
      console.log("🔑 Getting ElevenLabs signed URL with full context...");
      
      const { data: session } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-conversation-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': session?.session?.access_token 
              ? `Bearer ${session.session.access_token}`
              : `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            realTimeContext: context // Pass current real-time context
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.signedUrl) {
        throw new Error("No signed URL received from server");
      }

      console.log("🚀 Starting ElevenLabs conversation with dynamic variables...");
      console.log("📝 Dynamic variables:", Object.keys(data.dynamicVariables || {}));
      
      // Start conversation with signed URL and dynamic variables
      await conversation.startSession({
        signedUrl: data.signedUrl,
        dynamicVariables: data.dynamicVariables || {},
      });

      console.log("✅ Conversation session started");

    } catch (err) {
      console.error("Failed to start ElevenLabs conversation:", err);
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto";
      setError(errorMessage);
      setStatus('error');
      
      if (errorMessage.includes("Permission denied") || errorMessage.includes("not-allowed")) {
        toast.error("Permesso microfono negato");
      } else if (errorMessage.includes("overrides")) {
        toast.error("Abilita 'Client Overrides' nella dashboard ElevenLabs");
      } else {
        toast.error(`Errore: ${errorMessage}`);
      }
    }
  }, [conversation, context]);

  const stop = useCallback(async () => {
    console.log("🛑 Stopping ElevenLabs conversation...");
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("Error stopping conversation:", err);
    }
    setStatus('idle');
    setAudioLevel(0);
  }, [conversation]);

  return {
    isActive: status === 'connected',
    isConnecting: status === 'connecting',
    isSpeaking: conversation.isSpeaking,
    isListening: status === 'connected' && !conversation.isSpeaking,
    audioLevel,
    status,
    error,
    start,
    stop,
  };
};
