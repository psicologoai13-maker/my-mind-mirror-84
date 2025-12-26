import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock, User, Stethoscope } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('Email non valida');
const passwordSchema = z.string().min(6, 'La password deve avere almeno 6 caratteri');

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isDoctor, setIsDoctor] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { role, setUserRole, refetch: refetchRole } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      if (role === 'doctor') {
        navigate('/doctor-dashboard');
      } else {
        navigate('/');
      }
    }
  }, [user, role, navigate]);

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
          // Role will be fetched and redirect handled by useEffect
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
          // Wait for auth to complete, then set role
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

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center animate-slide-up">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-hero flex items-center justify-center shadow-card">
          {isDoctor ? (
            <Stethoscope className="w-10 h-10 text-primary-foreground" />
          ) : (
            <Sparkles className="w-10 h-10 text-primary-foreground" />
          )}
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {isDoctor ? 'Portale Medico' : 'Serenity'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isDoctor ? 'Accesso professionisti sanitari' : 'Il tuo spazio di benessere mentale'}
        </p>
      </div>

      {/* Auth Card */}
      <div className="w-full max-w-sm bg-card rounded-3xl p-6 shadow-card animate-slide-up stagger-2">
        <h2 className="font-display text-xl font-bold text-foreground text-center mb-6">
          {isLogin ? 'Bentornato!' : (isDoctor ? 'Registrazione Medico' : 'Crea il tuo account')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={isDoctor ? "Nome e Cognome (Dr.)" : "Il tuo nome"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10 h-12 rounded-xl"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10 h-12 rounded-xl"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="pl-10 h-12 rounded-xl"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl bg-gradient-hero hover:opacity-90"
            disabled={loading}
          >
            {loading ? 'Caricamento...' : isLogin ? 'Accedi' : 'Registrati'}
          </Button>
        </form>

        <div className="mt-6 text-center space-y-3">
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
            <div className="pt-2 border-t border-border">
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
      <p className="mt-8 text-xs text-muted-foreground text-center animate-fade-in">
        Accedendo accetti i nostri Termini di Servizio e Privacy Policy
      </p>
    </div>
  );
};

export default Auth;