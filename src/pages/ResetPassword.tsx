import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import FloatingParticles from '@/components/aria/FloatingParticles';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    if (type === 'recovery') {
      setIsRecovery(true);
    } else {
      // Also check query params
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('type') === 'recovery') {
        setIsRecovery(true);
      }
    }
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('La password deve avere almeno 6 caratteri');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Le password non corrispondono');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
      } else {
        setSuccess(true);
        toast.success('Password aggiornata con successo!');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    } catch {
      toast.error('Errore nel reset della password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-mesh" />
      <FloatingParticles />

      <div className="relative z-10 w-full max-w-sm">
        <motion.div
          className="card-glass p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Password Aggiornata!</h2>
              <p className="text-sm text-muted-foreground">Reindirizzamento alla home...</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Lock className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground">Nuova Password</h2>
                <p className="text-sm text-muted-foreground mt-2">Inserisci la tua nuova password</p>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <Input
                  type="password"
                  placeholder="Nuova password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 rounded-2xl"
                />
                <Input
                  type="password"
                  placeholder="Conferma password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-14 rounded-2xl"
                />
                <Button
                  type="submit"
                  className="w-full h-14 rounded-full bg-gradient-aria text-white shadow-aria-glow"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Aggiorna Password'}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;
