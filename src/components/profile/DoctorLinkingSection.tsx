import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stethoscope, Copy, RefreshCw, Check, Share2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DoctorLinkingSection: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch active share code
  const { data: activeCode, isLoading } = useQuery({
    queryKey: ['doctor-share-code', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('doctor_share_codes')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Generate new code mutation
  const generateCode = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Deactivate existing codes
      await supabase
        .from('doctor_share_codes')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Generate 6-character alphanumeric code
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from('doctor_share_codes')
        .insert({
          user_id: user.id,
          code,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctor-share-code', user?.id] });
      toast.success('Codice generato con successo!');
    },
    onError: (error) => {
      console.error('Error generating code:', error);
      toast.error('Errore nella generazione del codice');
    },
  });

  const handleCopyCode = async () => {
    if (!activeCode?.code) return;
    
    try {
      await navigator.clipboard.writeText(activeCode.code);
      setCopied(true);
      toast.success('Codice copiato!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Errore nella copia');
    }
  };

  const formatExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `Scade tra ${diffDays} giorni`;
  };

  return (
    <div className="bg-card rounded-3xl p-6 shadow-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Stethoscope className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Connessione Medico</h3>
          <p className="text-xs text-muted-foreground">Condividi i tuoi progressi con il tuo terapeuta</p>
        </div>
      </div>

      {activeCode ? (
        <div className="space-y-4">
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Il tuo codice di condivisione:</p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold tracking-widest text-primary">
                {activeCode.code}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyCode}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatExpiry(activeCode.expires_at)}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => generateCode.mutate()}
              disabled={generateCode.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateCode.isPending ? 'animate-spin' : ''}`} />
              Rigenera
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={handleCopyCode}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Condividi
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Genera un codice da condividere con il tuo medico o terapeuta. 
            Potranno visualizzare i tuoi grafici e report in sola lettura.
          </p>
          <Button
            variant="default"
            className="w-full"
            onClick={() => generateCode.mutate()}
            disabled={generateCode.isPending || isLoading}
          >
            {generateCode.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 mr-2" />
                Genera Codice di Condivisione
              </>
            )}
          </Button>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 p-3 bg-muted/50 rounded-xl">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Il medico potrà vedere solo i dati aggregati (grafici, punteggi, eventi chiave). 
          Le conversazioni letterali non sono mai condivise.
        </p>
      </div>
    </div>
  );
};

export default DoctorLinkingSection;
