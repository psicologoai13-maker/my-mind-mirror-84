import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-10 text-center animate-slide-up">
        <div className="w-24 h-24 mx-auto mb-5 rounded-3xl bg-primary/10 flex items-center justify-center shadow-premium">
          {isDoctor ? (
            <Stethoscope className="w-12 h-12 text-primary" />
          ) : (
            <Sparkles className="w-12 h-12 text-primary" />
          )}
        </div>
        <h1 className="text-4xl font-semibold text-foreground tracking-tight">
          {isDoctor ? 'Portale Medico' : 'Serenity'}
        </h1>
        <p className="text-muted-foreground mt-2 text-base">
          {isDoctor ? 'Accesso professionisti sanitari' : 'Il tuo spazio di benessere mentale'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-card rounded-3xl p-8 shadow-premium animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-xl font-semibold text-foreground text-center mb-8">
          {isLogin ? 'Bentornato!' : (isDoctor ? 'Registrazione Medico' : 'Crea il tuo account')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isDoctor ? "Nome e Cognome (Dr.)" : "Il tuo nome"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-12 h-14 rounded-2xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-12 h-14 rounded-2xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
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
              className="pl-12 h-14 rounded-2xl bg-muted/50 border-0 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-14 rounded-full text-base font-medium shadow-premium hover:shadow-elevated transition-all duration-300 mt-6"
            disabled={loading}
          >
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
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setIsDoctor(!isDoctor)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                <Stethoscope className="w-4 h-4" />
                {isDoctor ? 'Registrati come Paziente' : 'Sei un Medico? Registrati qui'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-muted-foreground text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
        Accedendo accetti i nostri Termini di Servizio e Privacy Policy
      </p>
    </div>
  );
};

export default Auth;