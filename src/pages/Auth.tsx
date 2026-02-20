import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, Stethoscope, Loader2, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import FloatingParticles from '@/components/aria/FloatingParticles';

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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
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
          }, 500);
          setShowEmailConfirmation(true);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error('Inserisci la tua email prima');
      return;
    }
    try {
      emailSchema.parse(email);
    } catch {
      toast.error('Email non valida');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Email di recupero inviata! Controlla la tua casella.');
        setShowForgotPassword(false);
      }
    } catch {
      toast.error('Errore nell\'invio dell\'email');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  // Email confirmation screen after signup
  if (showEmailConfirmation) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh" />
        <FloatingParticles />
        <motion.div
          className="relative z-10 card-glass p-8 max-w-sm w-full text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Controlla la tua email!</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Abbiamo inviato un link di conferma a:
          </p>
          <p className="text-sm font-medium text-foreground mb-6">{email}</p>
          <p className="text-xs text-muted-foreground mb-6">
            Clicca sul link nell'email per attivare il tuo account. Controlla anche la cartella spam.
          </p>
          <Button
            variant="outline"
            className="w-full rounded-full"
            onClick={() => {
              setShowEmailConfirmation(false);
              setIsLogin(true);
            }}
          >
            Torna al Login
          </Button>
        </motion.div>
      </div>
    );
  }

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh" />
        <FloatingParticles />
        <motion.div
          className="relative z-10 card-glass p-8 max-w-sm w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => setShowForgotPassword(false)}
            className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al login
          </button>
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Mail className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">Password dimenticata?</h2>
            <p className="text-sm text-muted-foreground mt-2">Inserisci la tua email e ti invieremo un link per reimpostarla.</p>
          </div>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="La tua email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl"
            />
            <Button
              onClick={handleForgotPassword}
              className="w-full h-14 rounded-full bg-gradient-aria text-white shadow-aria-glow"
              disabled={forgotPasswordLoading}
            >
              {forgotPasswordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Invia link di recupero'}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Loading screen during redirect
  if (isRedirecting || (user && (authLoading || roleLoading || profileLoading))) {
    return (
      <div className="min-h-dvh bg-background bg-gradient-mesh flex flex-col items-center justify-center">
        <FloatingParticles />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-4 relative z-10"
        >
          <div className="w-20 h-20 rounded-3xl card-glass flex items-center justify-center shadow-aria-glow">
            <Loader2 className="w-10 h-10 animate-spin text-aria-violet" />
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
      
      {/* Floating Particles */}
      <FloatingParticles />
      
      {/* Floating orbs with Aurora colors - Enhanced */}
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
      {/* Third smaller orb */}
      <motion.div 
        className="absolute top-1/3 right-1/4 w-40 h-40 rounded-full bg-aria-violet/20 blur-2xl"
        animate={{ 
          x: [0, 15, -10, 0],
          y: [0, -10, 15, 0],
          scale: [1, 1.1, 0.95, 1]
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo with Concentric Rings */}
        <motion.div 
          className="mb-10 text-center"
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div 
            className="relative w-28 h-28 mx-auto mb-6"
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Outer ring */}
            <motion.div 
              className="absolute inset-[-16px] rounded-full border border-aria-violet/20 ring-concentric-2"
            />
            
            {/* Middle ring */}
            <motion.div 
              className="absolute inset-[-8px] rounded-full border border-aria-violet/30 ring-concentric-1"
            />
            
            {/* Main logo container */}
            <div className="w-28 h-28 rounded-3xl card-glass flex items-center justify-center shadow-aria-glow">
              <AnimatePresence mode="wait">
                {isDoctor ? (
                  <motion.div
                    key="doctor"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Stethoscope className="w-14 h-14 text-aria-violet" />
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
                    <Sparkles className="w-14 h-14 text-aria-violet" />
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
            </div>
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

        {/* Auth Card - Enhanced Glass */}
        <motion.div 
          className="card-glass p-8 relative overflow-hidden"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Inner glow effect - More visible */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent" />
            <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-gradient-to-tl from-aria-violet/5 to-transparent" />
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
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
                  <Input
                    type="text"
                    placeholder={isDoctor ? "Nome e Cognome (Dr.)" : "Il tuo nome"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={() => setFocusedField('name')}
                    onBlur={() => setFocusedField(null)}
                    className={`pl-12 h-14 rounded-2xl bg-glass backdrop-blur-xl border-2 transition-all duration-300 ${
                      focusedField === 'name' 
                        ? 'border-aria-violet shadow-[0_0_20px_rgba(155,111,208,0.25)]' 
                        : 'border-glass-border'
                    }`}
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
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                className={`pl-12 h-14 rounded-2xl bg-glass backdrop-blur-xl border-2 transition-all duration-300 ${
                  focusedField === 'email' 
                    ? 'border-aria-violet shadow-[0_0_20px_rgba(155,111,208,0.25)]' 
                    : 'border-glass-border'
                }`}
              />
            </motion.div>

            <motion.div 
              className="relative"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                className={`pl-12 h-14 rounded-2xl bg-glass backdrop-blur-xl border-2 transition-all duration-300 ${
                  focusedField === 'password' 
                    ? 'border-aria-violet shadow-[0_0_20px_rgba(155,111,208,0.25)]' 
                    : 'border-glass-border'
                }`}
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
            {isLogin && (
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-aria-violet/80 hover:text-aria-violet transition-colors"
              >
                Password dimenticata?
              </button>
            )}

            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors block mx-auto"
            >
              {isLogin ? 'Non hai un account? ' : 'Hai già un account? '}
              <span className="text-aria-violet font-medium">
                {isLogin ? 'Registrati' : 'Accedi'}
              </span>
            </button>

            <AnimatePresence>
              {!isLogin && (
                <motion.div 
                  className="pt-4"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Gradient divider */}
                  <div className="divider-gradient mb-4" />
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
          <Link to="/terms" className="text-aria-violet/80 hover:text-aria-violet transition-colors">
            Termini di Servizio
          </Link>
          {' '}e{' '}
          <Link to="/privacy" className="text-aria-violet/80 hover:text-aria-violet transition-colors">
            Privacy Policy
          </Link>
        </motion.p>
      </div>
    </div>
  );
};

export default Auth;
