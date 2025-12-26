import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/useProfile';
import { Copy, RefreshCw, UserCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const PatientConnectionCode: React.FC = () => {
  const { profile, isLoading, refetch } = useProfile();
  const { user } = useAuth();
  const [regenerating, setRegenerating] = useState(false);

  const connectionCode = (profile as any)?.connection_code || '';

  const handleCopy = async () => {
    if (!connectionCode) return;
    
    try {
      await navigator.clipboard.writeText(connectionCode);
      toast.success('Codice copiato!');
    } catch (err) {
      toast.error('Errore nella copia');
    }
  };

  const handleRegenerate = async () => {
    if (!user) return;
    
    setRegenerating(true);
    try {
      // Generate new code using RPC
      const { data: newCode } = await supabase.rpc('generate_connection_code');
      
      if (newCode) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ connection_code: newCode })
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        await refetch();
        toast.success('Nuovo codice generato!');
      }
    } catch (err) {
      console.error('Error regenerating code:', err);
      toast.error('Errore nella generazione');
    } finally {
      setRegenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-6 shadow-card">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">
            Connessione Medico
          </h3>
          <p className="text-xs text-muted-foreground">
            Condividi questo codice con il tuo terapeuta
          </p>
        </div>
      </div>

      {/* Code Display */}
      <div className="bg-muted rounded-2xl p-4 mb-4">
        <p className="text-xs text-muted-foreground text-center mb-2">
          Il tuo codice di connessione
        </p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-3xl font-mono font-bold tracking-[0.3em] text-foreground">
            {connectionCode || '--------'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-primary/5 rounded-xl p-3 mb-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          📋 Fornisci questo codice al tuo medico o terapeuta. 
          Potranno così accedere ai tuoi dati di benessere (grafici, temi, riassunti AI) 
          in modalità sola lettura. <strong>Non vedranno le tue conversazioni private.</strong>
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={handleCopy}
          disabled={!connectionCode}
        >
          <Copy className="w-4 h-4 mr-2" />
          Copia Codice
        </Button>
        <Button 
          variant="ghost"
          size="icon"
          onClick={handleRegenerate}
          disabled={regenerating}
          title="Genera nuovo codice"
        >
          {regenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-3">
        Rigenerare il codice invaliderà i collegamenti esistenti
      </p>
    </div>
  );
};

export default PatientConnectionCode;