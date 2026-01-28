import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '@/components/layout/MobileLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, User, Mail, Calendar, Ruler, Check, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ProfilePersonal: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, updateProfile, isLoading } = useProfile();
  
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [height, setHeight] = useState('');
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      const answers = profile.onboarding_answers as any;
      if (answers?.physicalData) {
        setBirthYear(answers.physicalData.birthYear?.toString() || '');
        setHeight(answers.physicalData.height?.toString() || '');
      }
    }
  }, [profile]);

  const handleSave = async (field: string) => {
    setIsSaving(true);
    try {
      if (field === 'name') {
        await updateProfile.mutateAsync({ name });
      } else {
        const currentAnswers = (profile?.onboarding_answers as any) || {};
        const newAnswers = {
          ...currentAnswers,
          physicalData: {
            ...currentAnswers.physicalData,
            ...(field === 'birthYear' ? { birthYear: parseInt(birthYear) } : {}),
            ...(field === 'height' ? { height: parseInt(height) } : {}),
          }
        };
        await updateProfile.mutateAsync({ onboarding_answers: newAnswers });
      }
      toast.success('Salvato!');
      setEditingField(null);
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (
    icon: React.ReactNode,
    label: string,
    value: string,
    fieldKey: string,
    onChange: (v: string) => void,
    type: string = 'text',
    readOnly: boolean = false,
    suffix?: string
  ) => {
    const isEditing = editingField === fieldKey;
    
    return (
      <div className="bg-card rounded-2xl p-4 border border-border/50">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
            {icon}
          </div>
          <Label className="text-sm text-muted-foreground">{label}</Label>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing && !readOnly ? (
            <>
              <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1"
                autoFocus
              />
              {suffix && <span className="text-muted-foreground text-sm">{suffix}</span>}
              <Button
                size="sm"
                onClick={() => handleSave(fieldKey)}
                disabled={isSaving}
                className="shrink-0"
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingField(null)}
                className="shrink-0"
              >
                Annulla
              </Button>
            </>
          ) : (
            <button
              onClick={() => !readOnly && setEditingField(fieldKey)}
              className={cn(
                "flex-1 text-left p-3 rounded-xl border border-border/50 bg-muted/30 flex items-center justify-between",
                !readOnly && "hover:bg-muted/50 cursor-pointer"
              )}
              disabled={readOnly}
            >
              <span className="font-medium">
                {value || 'Non impostato'}
                {suffix && value && ` ${suffix}`}
              </span>
              {readOnly ? (
                <Lock className="w-4 h-4 text-muted-foreground" />
              ) : (
                <span className="text-xs text-primary">Modifica</span>
              )}
            </button>
          )}
        </div>
        {readOnly && (
          <p className="text-xs text-muted-foreground mt-2">
            Non modificabile direttamente
          </p>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <MobileLayout hideNav>
        <div className="min-h-dvh flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout hideNav>
      <header className="px-6 pt-8 pb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/profile')}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-xl font-bold text-foreground">Dati Personali</h1>
        </div>
      </header>

      <div className="px-6 space-y-4 pb-8">
        {renderField(
          <User className="w-4 h-4 text-foreground" />,
          'Nome',
          name,
          'name',
          setName
        )}

        {renderField(
          <Mail className="w-4 h-4 text-foreground" />,
          'Email',
          user?.email || '',
          'email',
          () => {},
          'email',
          true
        )}

        {renderField(
          <Calendar className="w-4 h-4 text-foreground" />,
          'Anno di nascita',
          birthYear,
          'birthYear',
          setBirthYear,
          'number'
        )}

        {renderField(
          <Ruler className="w-4 h-4 text-foreground" />,
          'Altezza',
          height,
          'height',
          setHeight,
          'number',
          false,
          'cm'
        )}

        <div className="pt-4">
          <p className="text-xs text-muted-foreground text-center">
            I dati personali sono utilizzati per personalizzare la tua esperienza con Aria.
          </p>
        </div>
      </div>
    </MobileLayout>
  );
};

export default ProfilePersonal;
