import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, Copy, RefreshCw, Check, Trash2, Eye, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const SharedAccessSection: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  // Fetch active access token
  const { data: activeAccess, isLoading } = useQuery({
    queryKey: ['shared-access', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('shared_access')
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

  // Generate new token mutation
  const generateAccess = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      // Deactivate existing tokens
      await supabase
        .from('shared_access')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Generate 32-character token
      const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      let token = '';
      for (let i = 0; i < 32; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Set expiration to 30 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { data, error } = await supabase
        .from('shared_access')
        .insert({
          user_id: user.id,
          token,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-access', user?.id] });
      toast.success('Link di accesso generato!');
    },
    onError: (error) => {
      console.error('Error generating access:', error);
      toast.error('Errore nella generazione del link');
    },
  });

  // Revoke access mutation
  const revokeAccess = useMutation({
    mutationFn: async () => {
      if (!user || !activeAccess) throw new Error('No access to revoke');

      const { error } = await supabase
        .from('shared_access')
        .update({ is_active: false })
        .eq('id', activeAccess.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-access', user?.id] });
      toast.success('Accesso revocato');
    },
    onError: (error) => {
      console.error('Error revoking access:', error);
      toast.error('Errore nella revoca');
    },
  });

  const getShareUrl = () => {
    if (!activeAccess?.token) return '';
    return `${window.location.origin}/doctor-view/${activeAccess.token}`;
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    if (!url) return;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiato!');
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
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Link2 className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-foreground">Dashboard Medico Live</h3>
          <p className="text-xs text-muted-foreground">Condividi una visualizzazione in tempo reale</p>
        </div>
      </div>

      {activeAccess ? (
        <div className="space-y-4">
          <div className="bg-muted rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-2">Link attivo:</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background px-2 py-1 rounded flex-1 truncate">
                {getShareUrl()}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-muted-foreground">
                {formatExpiry(activeAccess.expires_at)}
              </p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                <span>{activeAccess.access_count} visualizzazioni</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => generateAccess.mutate()}
              disabled={generateAccess.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${generateAccess.isPending ? 'animate-spin' : ''}`} />
              Rigenera
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  disabled={revokeAccess.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Revoca
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revocare l'accesso?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Il medico non potrà più visualizzare i tuoi dati con questo link. 
                    Potrai generare un nuovo link in qualsiasi momento.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annulla</AlertDialogCancel>
                  <AlertDialogAction onClick={() => revokeAccess.mutate()}>
                    Revoca Accesso
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Genera un link da condividere con il tuo medico o terapeuta. 
            Potranno visualizzare la tua dashboard in tempo reale (grafici, punteggi, eventi chiave).
          </p>
          <Button
            variant="default"
            className="w-full"
            onClick={() => generateAccess.mutate()}
            disabled={generateAccess.isPending || isLoading}
          >
            {generateAccess.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Generazione...
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4 mr-2" />
                Genera Link di Accesso
              </>
            )}
          </Button>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 p-3 bg-muted/50 rounded-xl">
        <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Il medico vedrà solo i dati aggregati. Le conversazioni letterali non sono mai condivise.
          Puoi revocare l'accesso in qualsiasi momento.
        </p>
      </div>
    </div>
  );
};

export default SharedAccessSection;
