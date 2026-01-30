import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, Stethoscope, Loader2 } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Email non valida');
const passwordSchema = z.string().min(6, 'La password deve avere almeno 6 caratteri');

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const { role, isLoading: roleLoading, setUserRole, refetch: refetchRole } = useUserRole();
  const { profile, isLoading: profileLoading } = useProfile();
  const navigate = useNavigate();

  // Redirect logic when user is authenticated
  useEffect(() => {
    if (!user || authLoading) return;
    
    // Wait for role and profile to load
    if (roleLoading || profileLoading) return;
    
    setIsRedirecting(true);
    
    // Doctor redirect
    if (role === 'doctor') {
      navigate('/doctor-dashboard', { replace: true });
      return;
    }
    
    // Patient redirect - check onboarding status
    if (profile && (profile as any).onboarding_completed) {
      navigate('/', { replace: true });
    } else {
      navigate('/onboarding', { replace: true });
    }
  }, [user, authLoading, role, roleLoading, profile, profileLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Credenziali non valide');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Benvenuto!');
        }
      } else {
        const { error } = await signUp(email, password, name);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email già registrata');
          } else {
            toast.error(error.message);
          }
        } else {
          setTimeout(async () => {
            const roleToSet = isDoctor ? 'doctor' : 'patient';
            await setUserRole(roleToSet);
            await refetchRole();
            toast.success(isDoctor ? 'Account Medico creato!' : 'Account creato! Benvenuto in Serenity.');
          }, 500);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen while redirecting
  if (isRedirecting || (user && (authLoading || roleLoading || profileLoading))) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-glass backdrop-blur-xl border border-glass-border flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Caricamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Aurora Background */}
      <div className="absolute inset-0 bg-gradient-aria-subtle opacity-30" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <motion.div 
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <motion.div 
            className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-glass backdrop-blur-xl border border-glass-border flex items-center justify-center shadow-glass"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
          >
            {isDoctor ? (
              <Stethoscope className="w-12 h-12 text-primary" />
            ) : (
              <Sparkles className="w-12 h-12 text-primary" />
            )}
          </motion.div>
          <h1 className="font-display text-4xl font-bold text-foreground tracking-tight">
            {isDoctor ? 'Portale Medico' : 'Serenity'}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {isDoctor ? 'Accesso professionisti sanitari' : 'Il tuo spazio di benessere mentale'}
          </p>
        </motion.div>

        {/* Auth Card */}
        <motion.div 
          className="bg-glass backdrop-blur-xl rounded-3xl p-8 border border-glass-border shadow-glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <h2 className="text-xl font-semibold text-foreground text-center mb-8">
            {isLogin ? 'Bentornato!' : (isDoctor ? 'Registrazione Medico' : 'Crea il tuo account')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <motion.div 
                className="relative"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={isDoctor ? "Nome e Cognome (Dr.)" : "Il tuo nome"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-12 h-14 rounded-2xl bg-glass-subtle border-glass-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </motion.div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-12 h-14 rounded-2xl bg-glass-subtle border-glass-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-12 h-14 rounded-2xl bg-glass-subtle border-glass-border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-14 rounded-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 shadow-glass-glow hover:shadow-glass-elevated transition-all duration-300 mt-6"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
            </Button>
          </form>

          <div className="mt-8 text-center space-y-4">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
              <span className="text-primary font-medium">
                {isLogin ? 'Registrati' : 'Accedi'}
              </span>
            </button>

            {!isLogin && (
              <motion.div 
                className="pt-4 border-t border-glass-border"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onClick={() => setIsDoctor(!isDoctor)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 mx-auto"
                >
                  <Stethoscope className="w-4 h-4" />
                  {isDoctor ? 'Registrati come Paziente' : 'Sei un Medico? Registrati qui'}
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.p 
          className="mt-10 text-xs text-muted-foreground text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Accedendo accetti i nostri Termini di Servizio e Privacy Policy
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;
