import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, Stethoscope, Loader2, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    if (!user || authLoading) return;
    if (roleLoading || profileLoading) return;
    
    setIsRedirecting(true);
    
    if (role === 'doctor') {
      navigate('/doctor-dashboard', { replace: true });
      return;
    }
    
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

  // Loading screen during redirect
  if (isRedirecting || (user && (authLoading || roleLoading || profileLoading))) {
    return (
      <div className="min-h-dvh bg-background bg-gradient-mesh flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-3xl card-glass flex items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground font-medium">Caricamento...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Aurora Ambient Background */}
      <div className="absolute inset-0 bg-gradient-mesh" />
      <div className="absolute inset-0 bg-gradient-aria-subtle opacity-60" />
      
      {/* Floating orbs with Aurora colors */}
      <motion.div 
        className="absolute top-20 left-10 w-64 h-64 rounded-full bg-aria-violet/15 blur-3xl"
        animate={{ 
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-aria-indigo/15 blur-3xl"
        animate={{ 
          x: [0, -20, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-aria-purple/10 blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <motion.div 
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
            className="w-28 h-28 mx-auto mb-6 rounded-3xl card-glass flex items-center justify-center"
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          >
            <AnimatePresence mode="wait">
              {isDoctor ? (
                <motion.div
                  key="doctor"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Stethoscope className="w-14 h-14 text-primary" />
                </motion.div>
              ) : (
                <motion.div
                  key="patient"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -180 }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="relative"
                >
                  <Sparkles className="w-14 h-14 text-primary" />
                  <motion.div
                    className="absolute inset-0"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  >
                    <div className="absolute -top-1 left-1/2 w-2 h-2 rounded-full bg-aria-violet/60" />
                    <div className="absolute top-1/2 -right-1 w-1.5 h-1.5 rounded-full bg-aria-indigo/50" />
                    <div className="absolute -bottom-1 left-1/3 w-1 h-1 rounded-full bg-aria-purple/40" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.h1 
            className="font-display text-4xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {isDoctor ? 'Portale Medico' : 'Serenity'}
          </motion.h1>
          <motion.p 
            className="text-muted-foreground mt-3 text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isDoctor ? 'Accesso professionisti sanitari' : 'Il tuo spazio di benessere mentale'}
          </motion.p>
        </motion.div>

        {/* Auth Card */}
        <motion.div 
          className="card-glass p-8"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Inner glow effect */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent" />
          </div>
          
          <motion.h2 
            className="relative text-xl font-semibold text-foreground text-center mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isLogin ? 'Bentornato!' : (isDoctor ? 'Registrazione Medico' : 'Crea il tuo account')}
          </motion.h2>

          <form onSubmit={handleSubmit} className="relative space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div 
                  className="relative"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder={isDoctor ? "Nome e Cognome (Dr.)" : "Il tuo nome"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-12 h-14 rounded-2xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-12 h-14 rounded-2xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </motion.div>

            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-12 h-14 rounded-2xl bg-secondary/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Button 
                type="submit" 
                className="w-full h-14 rounded-full text-base font-semibold bg-gradient-aria text-white shadow-aria-glow hover:shadow-elevated transition-all duration-300 mt-6 group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Accedi' : 'Registrati'}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </motion.div>
          </form>

          <motion.div 
            className="relative mt-8 text-center space-y-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
              <span className="text-aria-violet font-medium">
                {isLogin ? 'Registrati' : 'Accedi'}
              </span>
            </button>

            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  className="pt-4 border-t border-border/50"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <button
                    onClick={() => setIsDoctor(!isDoctor)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 mx-auto group"
                  >
                    <Stethoscope className="w-4 h-4 group-hover:text-aria-violet transition-colors" />
                    {isDoctor ? 'Registrati come Paziente' : 'Sei un Medico? Registrati qui'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.p 
          className="mt-10 text-xs text-muted-foreground text-center leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          Accedendo accetti i nostri{' '}
          <span className="text-aria-violet/80 hover:text-aria-violet cursor-pointer transition-colors">
            Termini di Servizio
          </span>
          {' '}e{' '}
          <span className="text-aria-violet/80 hover:text-aria-violet cursor-pointer transition-colors">
            Privacy Policy
          </span>
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;
