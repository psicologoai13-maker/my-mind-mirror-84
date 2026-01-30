import React, { useState } from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { Hash, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Topic {
  tag: string;
  label: string;
  intensity: number;
  category: 'emotion' | 'psychology' | 'life_area' | 'vital';
  description: string;
}

// Topic definitions with descriptions
const TOPIC_CONFIG: Record<string, Omit<Topic, 'intensity'>> = {
  // Emotions
  joy: { tag: 'gioia', label: 'Gioia', category: 'emotion', description: 'Stai vivendo momenti di felicità e contentezza. La gioia influenza positivamente il tuo benessere generale e le relazioni.' },
  sadness: { tag: 'tristezza', label: 'Tristezza', category: 'emotion', description: 'Stai attraversando un periodo di malinconia. È normale e fa parte del ciclo emotivo. Parlarne può aiutarti.' },
  anger: { tag: 'rabbia', label: 'Rabbia', category: 'emotion', description: 'Stai provando frustrazione o irritazione. Riconoscere questa emozione è il primo passo per gestirla in modo costruttivo.' },
  fear: { tag: 'paura', label: 'Paura', category: 'emotion', description: 'Stai vivendo preoccupazioni o ansie. Identificare le cause può aiutarti a trovare strategie per affrontarle.' },
  apathy: { tag: 'apatia', label: 'Apatia', category: 'emotion', description: 'Stai sperimentando un calo di interesse o motivazione. Piccoli passi quotidiani possono aiutarti a ritrovare energia.' },
  hope: { tag: 'speranza', label: 'Speranza', category: 'emotion', description: 'Stai guardando al futuro con ottimismo. Questa emozione ti aiuta a perseverare nelle sfide.' },
  excitement: { tag: 'entusiasmo', label: 'Entusiasmo', category: 'emotion', description: 'Stai vivendo un periodo di energia positiva e anticipazione. Coltiva ciò che ti fa sentire così.' },
  nervousness: { tag: 'nervosismo', label: 'Nervosismo', category: 'emotion', description: 'Stai provando tensione o agitazione. Tecniche di respirazione e mindfulness possono aiutarti.' },
  
  // Psychology
  rumination: { tag: 'ruminazione', label: 'Ruminazione', category: 'psychology', description: 'Tendi a rimuginare sui pensieri. Prova a focalizzarti sul presente e su azioni concrete.' },
  burnout: { tag: 'stress', label: 'Stress', category: 'psychology', description: 'Stai vivendo un periodo di forte pressione. Ricorda di prenderti pause e di chiedere supporto quando serve.' },
  gratitude: { tag: 'gratitudine', label: 'Gratitudine', category: 'psychology', description: 'Stai coltivando riconoscenza per ciò che hai. Questo atteggiamento rafforza il benessere emotivo.' },
  loneliness: { tag: 'solitudine', label: 'Solitudine', category: 'psychology', description: 'Stai provando isolamento. Cerca connessioni anche piccole, possono fare la differenza.' },
  motivation: { tag: 'motivazione', label: 'Motivazione', category: 'psychology', description: 'La tua spinta interiore è un focus attuale. Coltivala con obiettivi chiari e raggiungibili.' },
  concentration: { tag: 'concentrazione', label: 'Focus', category: 'psychology', description: 'La tua capacità di concentrarti è rilevante. Ambienti tranquilli e pause regolari aiutano.' },
  self_worth: { tag: 'autostima', label: 'Autostima', category: 'psychology', description: 'La percezione di te stesso è importante in questo momento. Celebra i piccoli successi.' },
  
  // Life Areas
  work: { tag: 'lavoro', label: 'Lavoro', category: 'life_area', description: 'La sfera professionale è centrale per te ora. Bilancia impegno e recupero.' },
  love: { tag: 'amore', label: 'Amore', category: 'life_area', description: 'Le relazioni affettive sono importanti per il tuo equilibrio. Coltiva la comunicazione.' },
  health: { tag: 'salute', label: 'Salute', category: 'life_area', description: 'Il benessere fisico è un tuo focus. Ascolta il tuo corpo e le sue esigenze.' },
  social: { tag: 'sociale', label: 'Sociale', category: 'life_area', description: 'Le relazioni sociali stanno influenzando il tuo benessere. Connessioni autentiche nutrono.' },
  growth: { tag: 'crescita', label: 'Crescita', category: 'life_area', description: 'Lo sviluppo personale ti sta a cuore. Ogni piccolo progresso conta.' },
  
  // Vitals
  mood: { tag: 'umore', label: 'Umore', category: 'vital', description: 'Il tuo stato emotivo generale è un indicatore chiave. Monitorarlo ti aiuta a capire i pattern.' },
  anxiety: { tag: 'ansia', label: 'Ansia', category: 'vital', description: 'I livelli di preoccupazione sono rilevanti. Tecniche di grounding possono aiutarti.' },
  energy: { tag: 'energia', label: 'Energia', category: 'vital', description: 'I tuoi livelli di vitalità sono importanti. Sonno, movimento e alimentazione li influenzano.' },
  sleep: { tag: 'sonno', label: 'Sonno', category: 'vital', description: 'La qualità del riposo impatta tutto. Routine serali costanti migliorano il sonno.' },
};

const FocusTopics: React.FC = () => {
  const { emotions, deepPsychology, lifeAreas, vitals, hasData } = useTimeWeightedMetrics(30, 7);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  // Generate topics from all available data sources
  const topics = React.useMemo<Topic[]>(() => {
    const topicList: Topic[] = [];

    // Add emotions
    const emotionMap: Record<string, number | null> = {
      joy: emotions.joy,
      sadness: emotions.sadness,
      anger: emotions.anger,
      fear: emotions.fear,
      apathy: emotions.apathy,
    };

    Object.entries(emotionMap).forEach(([key, value]) => {
      if (value !== null && value > 0 && TOPIC_CONFIG[key]) {
        topicList.push({ ...TOPIC_CONFIG[key], intensity: value });
      }
    });

    // Add psychology topics
    const psychMap: Record<string, number | null> = {
      rumination: deepPsychology.rumination,
      burnout: deepPsychology.burnout_level,
      gratitude: deepPsychology.gratitude,
      loneliness: deepPsychology.loneliness_perceived,
      motivation: deepPsychology.motivation,
      concentration: deepPsychology.concentration,
      self_worth: deepPsychology.self_worth,
    };

    Object.entries(psychMap).forEach(([key, value]) => {
      if (value !== null && value >= 4 && TOPIC_CONFIG[key]) {
        topicList.push({ ...TOPIC_CONFIG[key], intensity: value });
      }
    });

    // Add life areas
    const lifeAreaMap: Record<string, number | null> = {
      work: lifeAreas.work,
      love: lifeAreas.love,
      health: lifeAreas.health,
      social: lifeAreas.social,
      growth: lifeAreas.growth,
    };

    Object.entries(lifeAreaMap).forEach(([key, value]) => {
      if (value !== null && value >= 5 && TOPIC_CONFIG[key]) {
        topicList.push({ ...TOPIC_CONFIG[key], intensity: value });
      }
    });

    // Add vitals if significant
    const vitalMap: Record<string, number | null> = {
      mood: vitals.mood,
      anxiety: vitals.anxiety,
      energy: vitals.energy,
      sleep: vitals.sleep,
    };

    Object.entries(vitalMap).forEach(([key, value]) => {
      if (value !== null && TOPIC_CONFIG[key]) {
        // Include vitals with notable values (very low or high)
        if (value <= 3 || value >= 7) {
          topicList.push({ ...TOPIC_CONFIG[key], intensity: value });
        }
      }
    });

    // Sort by intensity (highest first)
    const sorted = topicList.sort((a, b) => b.intensity - a.intensity);
    
    // Return exactly 4 or 6 topics (no gaps)
    if (sorted.length >= 6) {
      return sorted.slice(0, 6);
    }
    // If we have 4-5, return 4
    if (sorted.length >= 4) {
      return sorted.slice(0, 4);
    }
    // If less than 4, pad with defaults to always show 4
    const defaults = ['mood', 'energy', 'work', 'growth'];
    const existing = new Set(sorted.map(t => t.tag));
    
    for (const key of defaults) {
      if (sorted.length >= 4) break;
      if (!existing.has(TOPIC_CONFIG[key]?.tag)) {
        sorted.push({ ...TOPIC_CONFIG[key], intensity: 5 });
        existing.add(TOPIC_CONFIG[key]?.tag);
      }
    }
    
    return sorted.slice(0, 4);
  }, [emotions, deepPsychology, lifeAreas, vitals]);

  const getCategoryColor = (category: Topic['category'], index: number) => {
    const baseColors = {
      emotion: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20',
      psychology: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20',
      life_area: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      vital: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20',
    };
    return baseColors[category];
  };

  return (
    <>
      <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-5 shadow-soft border border-border/50">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-accent">
            <Hash className="w-4 h-4 text-accent-foreground" />
          </div>
          <h3 className="font-display font-semibold text-foreground">
            I tuoi Focus
          </h3>
        </div>

        {topics.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {topics.map((topic, index) => (
              <motion.button
                key={topic.tag}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedTopic(topic)}
                className={cn(
                  "px-3 py-2.5 rounded-2xl text-sm font-medium border transition-all duration-300",
                  "hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left",
                  getCategoryColor(topic.category, index)
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="capitalize truncate">{topic.label}</span>
                  <span className="text-xs opacity-60 ml-1 shrink-0">
                    {Math.round(topic.intensity)}/10
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <Sparkles className="w-6 h-6 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              Inizia a parlare per<br />scoprire i tuoi temi
            </p>
          </div>
        )}
      </div>

      {/* Topic Detail Dialog */}
      <Dialog open={!!selectedTopic} onOpenChange={() => setSelectedTopic(null)}>
        <DialogContent className="max-w-[320px] rounded-3xl p-0 bg-transparent border-none shadow-none">
          <AnimatePresence>
            {selectedTopic && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="card-glass p-5 rounded-3xl"
              >
                <DialogHeader className="mb-4">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "px-3 py-1.5 rounded-full text-sm font-semibold border",
                      getCategoryColor(selectedTopic.category, 0)
                    )}>
                      {selectedTopic.label}
                    </div>
                    <button 
                      onClick={() => setSelectedTopic(null)}
                      className="p-1.5 rounded-full hover:bg-secondary/80 transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Intensity indicator */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${selectedTopic.intensity * 10}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className={cn(
                          "h-full rounded-full",
                          selectedTopic.category === 'emotion' && "bg-rose-500",
                          selectedTopic.category === 'psychology' && "bg-violet-500",
                          selectedTopic.category === 'life_area' && "bg-emerald-500",
                          selectedTopic.category === 'vital' && "bg-sky-500",
                        )}
                      />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      {Math.round(selectedTopic.intensity)}/10
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {selectedTopic.description}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FocusTopics;
