import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, Music, Briefcase, Heart, Palette, Users,
  ChevronDown, ChevronUp, Plus, X, Save, Loader2,
  Sparkles, MessageCircle, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUserInterests, UserInterests } from '@/hooks/useUserInterests';
import { toast } from 'sonner';

const SPORT_OPTIONS = ['Calcio', 'Tennis', 'F1', 'Basket', 'Nuoto', 'Ciclismo', 'Running', 'Pallavolo'];
const MUSIC_GENRES = ['Pop', 'Rock', 'Hip-Hop', 'Classica', 'Jazz', 'Elettronica', 'Indie', 'Metal'];
const HOBBIES = ['Fotografia', 'Cucina', 'Gaming', 'Lettura', 'Viaggi', 'Cinema', 'Arte', 'Fitness'];
const INDUSTRIES = ['Tech', 'Healthcare', 'Finance', 'Education', 'Creative', 'Retail', 'Legal', 'Altro'];

interface CategorySectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({ 
  title, icon: Icon, iconColor, children, defaultOpen = false 
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/30 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", iconColor)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <span className="font-medium text-foreground">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface ChipSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  allowCustom?: boolean;
}

const ChipSelect: React.FC<ChipSelectProps> = ({ options, selected, onChange, allowCustom }) => {
  const [customValue, setCustomValue] = useState('');

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const addCustom = () => {
    if (customValue.trim() && !selected.includes(customValue.trim())) {
      onChange([...selected, customValue.trim()]);
      setCustomValue('');
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <Badge
            key={option}
            variant={selected.includes(option) ? "default" : "outline"}
            className={cn(
              "cursor-pointer transition-all",
              selected.includes(option) && "bg-primary"
            )}
            onClick={() => toggleOption(option)}
          >
            {option}
          </Badge>
        ))}
        {selected.filter(s => !options.includes(s)).map(custom => (
          <Badge
            key={custom}
            variant="default"
            className="bg-primary cursor-pointer"
            onClick={() => toggleOption(custom)}
          >
            {custom}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
      </div>
      {allowCustom && (
        <div className="flex gap-2">
          <Input
            placeholder="Aggiungi altro..."
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustom()}
            className="text-sm h-8"
          />
          <Button size="sm" variant="outline" onClick={addCustom} className="h-8">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

interface ArrayInputProps {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
}

const ArrayInput: React.FC<ArrayInputProps> = ({ label, placeholder, values, onChange }) => {
  const [inputValue, setInputValue] = useState('');

  const addValue = () => {
    if (inputValue.trim() && !values.includes(inputValue.trim())) {
      onChange([...values, inputValue.trim()]);
      setInputValue('');
    }
  };

  const removeValue = (val: string) => {
    onChange(values.filter(v => v !== val));
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map(val => (
          <Badge key={val} variant="secondary" className="cursor-pointer" onClick={() => removeValue(val)}>
            {val}
            <X className="w-3 h-3 ml-1" />
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addValue()}
          className="text-sm"
        />
        <Button size="sm" variant="outline" onClick={addValue}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

const InterestsSection: React.FC = () => {
  const { interests, isLoading, updateInterests } = useUserInterests();
  const [localInterests, setLocalInterests] = useState<Partial<UserInterests>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when interests load
  React.useEffect(() => {
    if (interests) {
      setLocalInterests(interests);
    }
  }, [interests]);

  const updateLocal = (updates: Partial<UserInterests>) => {
    setLocalInterests(prev => ({ ...prev, ...updates }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateInterests(localInterests);
      setHasChanges(false);
      toast.success('Interessi salvati! Aria ti conoscerà meglio 💚');
    } catch (error) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">I Tuoi Interessi</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Aiuta Aria a conoscerti meglio. Questi dati rendono le conversazioni più personali e pertinenti.
        </p>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {/* Sport */}
        <CategorySection title="Sport" icon={Trophy} iconColor="bg-green-500" defaultOpen>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Segui il calcio?</Label>
              <Switch
                checked={localInterests.follows_football || false}
                onCheckedChange={checked => updateLocal({ follows_football: checked })}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Sport che segui</Label>
              <ChipSelect
                options={SPORT_OPTIONS}
                selected={localInterests.sports_followed || []}
                onChange={vals => updateLocal({ sports_followed: vals })}
                allowCustom
              />
            </div>
            <ArrayInput
              label="Squadre del cuore"
              placeholder="es. Juventus, Ferrari..."
              values={localInterests.favorite_teams || []}
              onChange={vals => updateLocal({ favorite_teams: vals })}
            />
            <ArrayInput
              label="Atleti preferiti"
              placeholder="es. Sinner, Verstappen..."
              values={localInterests.favorite_athletes || []}
              onChange={vals => updateLocal({ favorite_athletes: vals })}
            />
          </div>
        </CategorySection>

        {/* Entertainment */}
        <CategorySection title="Intrattenimento" icon={Music} iconColor="bg-purple-500">
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Generi musicali</Label>
              <ChipSelect
                options={MUSIC_GENRES}
                selected={localInterests.music_genres || []}
                onChange={vals => updateLocal({ music_genres: vals })}
                allowCustom
              />
            </div>
            <ArrayInput
              label="Artisti preferiti"
              placeholder="es. Coldplay, Måneskin..."
              values={localInterests.favorite_artists || []}
              onChange={vals => updateLocal({ favorite_artists: vals })}
            />
            <ArrayInput
              label="Serie TV in corso"
              placeholder="es. The Bear, Succession..."
              values={localInterests.current_shows || []}
              onChange={vals => updateLocal({ current_shows: vals })}
            />
            <ArrayInput
              label="Podcast seguiti"
              placeholder="es. Muschio Selvaggio..."
              values={localInterests.podcasts || []}
              onChange={vals => updateLocal({ podcasts: vals })}
            />
          </div>
        </CategorySection>

        {/* Work */}
        <CategorySection title="Lavoro" icon={Briefcase} iconColor="bg-blue-500">
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Settore</Label>
              <ChipSelect
                options={INDUSTRIES}
                selected={localInterests.industry ? [localInterests.industry] : []}
                onChange={vals => updateLocal({ industry: vals[0] || null })}
              />
            </div>
            <ArrayInput
              label="Interessi professionali"
              placeholder="es. AI, Marketing..."
              values={localInterests.professional_interests || []}
              onChange={vals => updateLocal({ professional_interests: vals })}
            />
            <ArrayInput
              label="Obiettivi di carriera"
              placeholder="es. Promozione, cambio settore..."
              values={localInterests.career_goals || []}
              onChange={vals => updateLocal({ career_goals: vals })}
            />
          </div>
        </CategorySection>

        {/* Lifestyle */}
        <CategorySection title="Lifestyle" icon={Heart} iconColor="bg-red-500">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Hai animali domestici?</Label>
              <Switch
                checked={localInterests.pet_owner || false}
                onCheckedChange={checked => updateLocal({ pet_owner: checked })}
              />
            </div>
            {localInterests.pet_owner && (
              <div className="text-sm text-muted-foreground">
                Puoi dire ad Aria i nomi dei tuoi animali in chat, li ricorderà! 🐾
              </div>
            )}
            <ArrayInput
              label="Valori personali"
              placeholder="es. Famiglia, carriera, ambiente..."
              values={localInterests.personal_values || []}
              onChange={vals => updateLocal({ personal_values: vals })}
            />
            <div className="flex items-center justify-between">
              <Label className="text-sm">Interessato/a alla politica?</Label>
              <Switch
                checked={localInterests.political_interest || false}
                onCheckedChange={checked => updateLocal({ political_interest: checked })}
              />
            </div>
          </div>
        </CategorySection>

        {/* Hobbies */}
        <CategorySection title="Hobby & Attività" icon={Palette} iconColor="bg-orange-500">
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Hobby principali</Label>
              <ChipSelect
                options={HOBBIES}
                selected={[
                  ...(localInterests.creative_hobbies || []),
                  ...(localInterests.outdoor_activities || []),
                  ...(localInterests.indoor_activities || [])
                ]}
                onChange={vals => updateLocal({ creative_hobbies: vals })}
                allowCustom
              />
            </div>
            <ArrayInput
              label="Cosa vuoi imparare"
              placeholder="es. Chitarra, spagnolo..."
              values={localInterests.learning_interests || []}
              onChange={vals => updateLocal({ learning_interests: vals })}
            />
            <ArrayInput
              label="Mete dei sogni"
              placeholder="es. Giappone, Islanda..."
              values={localInterests.dream_destinations || []}
              onChange={vals => updateLocal({ dream_destinations: vals })}
            />
          </div>
        </CategorySection>

        {/* Social & Communication */}
        <CategorySection title="Preferenze Comunicazione" icon={MessageCircle} iconColor="bg-teal-500">
          <div className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Come vuoi essere chiamato/a?</Label>
              <Input
                placeholder="Nickname..."
                value={localInterests.nickname || ''}
                onChange={e => updateLocal({ nickname: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Stile umorismo Aria</Label>
              <div className="flex gap-2">
                {['Gentile', 'Sarcastico', 'Misto'].map(style => (
                  <Badge
                    key={style}
                    variant={localInterests.humor_preference === style.toLowerCase() ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => updateLocal({ humor_preference: style.toLowerCase() })}
                  >
                    {style}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Uso emoji</Label>
              <div className="flex gap-2">
                {['Molti', 'Moderati', 'Pochi'].map(pref => (
                  <Badge
                    key={pref}
                    variant={localInterests.emoji_preference === pref.toLowerCase() ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => updateLocal({ emoji_preference: pref.toLowerCase() })}
                  >
                    {pref}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CategorySection>

        {/* Safety */}
        <CategorySection title="Sensibilità" icon={Shield} iconColor="bg-slate-500">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Argomenti da evitare o trattare con cura nelle conversazioni con Aria.
            </p>
            <ArrayInput
              label="Argomenti sensibili"
              placeholder="es. Argomenti da evitare..."
              values={localInterests.sensitive_topics || []}
              onChange={vals => updateLocal({ sensitive_topics: vals })}
            />
            <ArrayInput
              label="Topic preferiti per distrarsi"
              placeholder="es. Viaggi, hobby..."
              values={localInterests.preferred_topics || []}
              onChange={vals => updateLocal({ preferred_topics: vals })}
            />
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">Sensibilità news</Label>
              <div className="flex gap-2">
                {['Tutto', 'Solo positive', 'Nessuna'].map(pref => (
                  <Badge
                    key={pref}
                    variant={localInterests.news_sensitivity === pref.toLowerCase().replace(' ', '_') ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => updateLocal({ news_sensitivity: pref.toLowerCase().replace(' ', '_') })}
                  >
                    {pref}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CategorySection>
      </div>

      {/* Save Button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-0 right-0 px-6 z-50"
          >
            <Button 
              onClick={handleSave} 
              disabled={isSaving}
              className="w-full rounded-2xl h-12 shadow-lg"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Salva Interessi
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InterestsSection;
