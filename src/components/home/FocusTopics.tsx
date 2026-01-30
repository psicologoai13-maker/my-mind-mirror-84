import React, { useState } from 'react';
import { useTimeWeightedMetrics } from '@/hooks/useTimeWeightedMetrics';
import { Hash, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface Topic {
  tag: string;
  intensity: number;
  description: string;
  category: 'emotion' | 'psychology' | 'life_area' | 'vital';
}

// Default focus topics when user doesn't have enough data
const DEFAULT_TOPICS: Topic[] = [
  { tag: 'benessere', intensity: 5, description: 'Il tuo livello generale di benessere psicofisico.', category: 'vital' },
  { tag: 'equilibrio', intensity: 5, description: 'L\'armonia tra le diverse aree della tua vita.', category: 'life_area' },
  { tag: 'energia', intensity: 5, description: 'La tua vitalità e capacità di affrontare la giornata.', category: 'vital' },
  { tag: 'serenità', intensity: 5, description: 'La calma interiore e la pace mentale.', category: 'emotion' },
  { tag: 'motivazione', intensity: 5, description: 'La spinta verso i tuoi obiettivi personali.', category: 'psychology' },
  { tag: 'relazioni', intensity: 5, description: 'La qualità delle tue connessioni sociali.', category: 'life_area' },
];

// Descriptions for all possible focus topics
const TOPIC_DESCRIPTIONS: Record<string, string> = {
  // Primary emotions
  gioia: 'La felicità e il piacere che stai provando nella tua vita quotidiana.',
  tristezza: 'Un\'emozione che può indicare bisogni non soddisfatti o perdite recenti.',
  rabbia: 'Un\'energia intensa che può segnalare confini violati o ingiustizie percepite.',
  paura: 'Un\'emozione protettiva che ti avvisa di potenziali minacce.',
  apatia: 'Una mancanza di interesse che può indicare esaurimento emotivo.',
  // Secondary emotions
  vergogna: 'Un\'emozione legata all\'autovalutazione e al giudizio sociale.',
  gelosia: 'Un\'emozione che emerge quando percepisci una minaccia alle tue relazioni.',
  speranza: 'L\'aspettativa positiva verso il futuro e le possibilità.',
  frustrazione: 'La reazione agli ostacoli che impediscono il raggiungimento dei tuoi obiettivi.',
  nostalgia: 'Un dolce-amaro ricordo del passato e di ciò che è stato.',
  nervosismo: 'Uno stato di agitazione che può precedere eventi importanti.',
  sovraccarico: 'La sensazione di avere troppe cose da gestire contemporaneamente.',
  eccitazione: 'L\'entusiasmo e l\'anticipazione positiva per qualcosa.',
  delusione: 'La discrepanza tra aspettative e realtà.',
  // Psychology
  ruminazione: 'La tendenza a rimuginare su pensieri negativi ricorrenti.',
  stress: 'Il livello di pressione che stai sperimentando nella vita.',
  gratitudine: 'La capacità di apprezzare ciò che hai nella tua vita.',
  solitudine: 'La percezione di isolamento o disconnessione dagli altri.',
  autoefficacia: 'La fiducia nelle tue capacità di affrontare le sfide.',
  chiarezza: 'La lucidità mentale e la capacità di pensare con ordine.',
  concentrazione: 'La capacità di mantenere l\'attenzione su ciò che conta.',
  burnout: 'L\'esaurimento fisico e mentale dovuto a stress prolungato.',
  sensodicolpa: 'Il peso emotivo di azioni o scelte passate.',
  irritabilità: 'La facilità con cui ti senti infastidito o frustrato.',
  // Life areas
  amore: 'La sfera affettiva e le relazioni intime.',
  lavoro: 'La tua vita professionale e la soddisfazione lavorativa.',
  salute: 'Il tuo benessere fisico e le abitudini salutari.',
  sociale: 'Le tue amicizie e connessioni con gli altri.',
  crescita: 'Il tuo sviluppo personale e l\'apprendimento continuo.',
  // Vitals
  umore: 'Il tuo stato emotivo generale momento per momento.',
  ansia: 'Il livello di preoccupazione e tensione che stai provando.',
  energia: 'La tua vitalità fisica e mentale.',
  sonno: 'La qualità e la quantità del tuo riposo notturno.',
};

const FocusTopics: React.FC = () => {
  const { emotions, deepPsychology, lifeAreas, vitals, hasData } = useTimeWeightedMetrics(30, 7);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  // Generate topics from all available data sources
  const topics = React.useMemo<Topic[]>(() => {
    const topicList: Topic[] = [];

    // Add vitals
    if (vitals.mood !== null && vitals.mood > 0) {
      topicList.push({ tag: 'umore', intensity: vitals.mood, description: TOPIC_DESCRIPTIONS.umore, category: 'vital' });
    }
    if (vitals.anxiety !== null && vitals.anxiety > 0) {
      topicList.push({ tag: 'ansia', intensity: vitals.anxiety, description: TOPIC_DESCRIPTIONS.ansia, category: 'vital' });
    }
    if (vitals.energy !== null && vitals.energy > 0) {
      topicList.push({ tag: 'energia', intensity: vitals.energy, description: TOPIC_DESCRIPTIONS.energia, category: 'vital' });
    }
    if (vitals.sleep !== null && vitals.sleep > 0) {
      topicList.push({ tag: 'sonno', intensity: vitals.sleep, description: TOPIC_DESCRIPTIONS.sonno, category: 'vital' });
    }

    // Add primary emotions
    if (emotions.joy !== null && emotions.joy > 0) {
      topicList.push({ tag: 'gioia', intensity: emotions.joy, description: TOPIC_DESCRIPTIONS.gioia, category: 'emotion' });
    }
    if (emotions.sadness !== null && emotions.sadness > 0) {
      topicList.push({ tag: 'tristezza', intensity: emotions.sadness, description: TOPIC_DESCRIPTIONS.tristezza, category: 'emotion' });
    }
    if (emotions.anger !== null && emotions.anger > 0) {
      topicList.push({ tag: 'rabbia', intensity: emotions.anger, description: TOPIC_DESCRIPTIONS.rabbia, category: 'emotion' });
    }
    if (emotions.fear !== null && emotions.fear > 0) {
      topicList.push({ tag: 'paura', intensity: emotions.fear, description: TOPIC_DESCRIPTIONS.paura, category: 'emotion' });
    }
    if (emotions.apathy !== null && emotions.apathy > 0) {
      topicList.push({ tag: 'apatia', intensity: emotions.apathy, description: TOPIC_DESCRIPTIONS.apatia, category: 'emotion' });
    }

    // Add secondary emotions
    if (emotions.shame !== null && emotions.shame > 0) {
      topicList.push({ tag: 'vergogna', intensity: emotions.shame, description: TOPIC_DESCRIPTIONS.vergogna, category: 'emotion' });
    }
    if (emotions.hope !== null && emotions.hope > 0) {
      topicList.push({ tag: 'speranza', intensity: emotions.hope, description: TOPIC_DESCRIPTIONS.speranza, category: 'emotion' });
    }
    if (emotions.frustration !== null && emotions.frustration > 0) {
      topicList.push({ tag: 'frustrazione', intensity: emotions.frustration, description: TOPIC_DESCRIPTIONS.frustrazione, category: 'emotion' });
    }
    if (emotions.nervousness !== null && emotions.nervousness > 0) {
      topicList.push({ tag: 'nervosismo', intensity: emotions.nervousness, description: TOPIC_DESCRIPTIONS.nervosismo, category: 'emotion' });
    }
    if (emotions.overwhelm !== null && emotions.overwhelm > 0) {
      topicList.push({ tag: 'sovraccarico', intensity: emotions.overwhelm, description: TOPIC_DESCRIPTIONS.sovraccarico, category: 'emotion' });
    }
    if (emotions.excitement !== null && emotions.excitement > 0) {
      topicList.push({ tag: 'eccitazione', intensity: emotions.excitement, description: TOPIC_DESCRIPTIONS.eccitazione, category: 'emotion' });
    }
    if (emotions.disappointment !== null && emotions.disappointment > 0) {
      topicList.push({ tag: 'delusione', intensity: emotions.disappointment, description: TOPIC_DESCRIPTIONS.delusione, category: 'emotion' });
    }

    // Add psychology topics
    if (deepPsychology.rumination !== null && deepPsychology.rumination >= 4) {
      topicList.push({ tag: 'ruminazione', intensity: deepPsychology.rumination, description: TOPIC_DESCRIPTIONS.ruminazione, category: 'psychology' });
    }
    if (deepPsychology.burnout_level !== null && deepPsychology.burnout_level >= 4) {
      topicList.push({ tag: 'burnout', intensity: deepPsychology.burnout_level, description: TOPIC_DESCRIPTIONS.burnout, category: 'psychology' });
    }
    if (deepPsychology.gratitude !== null && deepPsychology.gratitude >= 4) {
      topicList.push({ tag: 'gratitudine', intensity: deepPsychology.gratitude, description: TOPIC_DESCRIPTIONS.gratitudine, category: 'psychology' });
    }
    if (deepPsychology.loneliness_perceived !== null && deepPsychology.loneliness_perceived >= 4) {
      topicList.push({ tag: 'solitudine', intensity: deepPsychology.loneliness_perceived, description: TOPIC_DESCRIPTIONS.solitudine, category: 'psychology' });
    }
    if (deepPsychology.self_efficacy !== null && deepPsychology.self_efficacy >= 4) {
      topicList.push({ tag: 'autoefficacia', intensity: deepPsychology.self_efficacy, description: TOPIC_DESCRIPTIONS.autoefficacia, category: 'psychology' });
    }
    if (deepPsychology.mental_clarity !== null && deepPsychology.mental_clarity >= 4) {
      topicList.push({ tag: 'chiarezza', intensity: deepPsychology.mental_clarity, description: TOPIC_DESCRIPTIONS.chiarezza, category: 'psychology' });
    }
    if (deepPsychology.irritability !== null && deepPsychology.irritability >= 4) {
      topicList.push({ tag: 'irritabilità', intensity: deepPsychology.irritability, description: TOPIC_DESCRIPTIONS.irritabilità, category: 'psychology' });
    }
    if (deepPsychology.guilt !== null && deepPsychology.guilt >= 4) {
      topicList.push({ tag: 'sensodicolpa', intensity: deepPsychology.guilt, description: TOPIC_DESCRIPTIONS.sensodicolpa, category: 'psychology' });
    }

    // Add life areas
    if (lifeAreas.love !== null && lifeAreas.love > 0) {
      topicList.push({ tag: 'amore', intensity: lifeAreas.love, description: TOPIC_DESCRIPTIONS.amore, category: 'life_area' });
    }
    if (lifeAreas.work !== null && lifeAreas.work > 0) {
      topicList.push({ tag: 'lavoro', intensity: lifeAreas.work, description: TOPIC_DESCRIPTIONS.lavoro, category: 'life_area' });
    }
    if (lifeAreas.health !== null && lifeAreas.health > 0) {
      topicList.push({ tag: 'salute', intensity: lifeAreas.health, description: TOPIC_DESCRIPTIONS.salute, category: 'life_area' });
    }
    if (lifeAreas.social !== null && lifeAreas.social > 0) {
      topicList.push({ tag: 'sociale', intensity: lifeAreas.social, description: TOPIC_DESCRIPTIONS.sociale, category: 'life_area' });
    }
    if (lifeAreas.growth !== null && lifeAreas.growth > 0) {
      topicList.push({ tag: 'crescita', intensity: lifeAreas.growth, description: TOPIC_DESCRIPTIONS.crescita, category: 'life_area' });
    }

    // Sort by intensity (highest first) and take top topics
    const sorted = topicList.sort((a, b) => b.intensity - a.intensity);
    
    // Determine target count: 4 minimum, 6 if we have more than 4
    const targetCount = sorted.length > 4 ? 6 : 4;
    
    // If we have enough topics, return them
    if (sorted.length >= targetCount) {
      return sorted.slice(0, targetCount);
    }
    
    // Fill with defaults if not enough
    const existing = sorted.map(t => t.tag);
    const fillers = DEFAULT_TOPICS.filter(d => !existing.includes(d.tag));
    const combined = [...sorted, ...fillers];
    
    return combined.slice(0, targetCount);
  }, [emotions, deepPsychology, lifeAreas, vitals, hasData]);

  const getCategoryStyle = (category: Topic['category']) => {
    switch (category) {
      case 'emotion':
        return 'bg-primary/15 text-primary border-primary/20 hover:bg-primary/25';
      case 'psychology':
        return 'bg-accent/80 text-accent-foreground border-accent hover:bg-accent';
      case 'life_area':
        return 'bg-secondary text-secondary-foreground border-secondary/50 hover:bg-secondary/80';
      case 'vital':
        return 'bg-muted text-muted-foreground border-muted hover:bg-muted/80';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const handleTopicClick = (tag: string) => {
    setExpandedTopic(expandedTopic === tag ? null : tag);
  };

  return (
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
        <div className="space-y-3">
          {/* Topics Grid - always 2 columns */}
          <div className="grid grid-cols-2 gap-2">
            {topics.map((topic, index) => (
              <motion.button
                key={topic.tag}
                onClick={() => handleTopicClick(topic.tag)}
                className={cn(
                  "px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200",
                  "cursor-pointer text-left w-full",
                  getCategoryStyle(topic.category),
                  expandedTopic === topic.tag && "ring-2 ring-primary/50"
                )}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-between">
                  <span className="capitalize truncate">{topic.tag}</span>
                  <span className="text-xs opacity-70 ml-1 shrink-0">
                    {Math.round(topic.intensity)}/10
                  </span>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Expanded Description */}
          <AnimatePresence>
            {expandedTopic && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-muted/50 rounded-xl p-3 border border-border/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-foreground capitalize mb-1">
                        {expandedTopic}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {topics.find(t => t.tag === expandedTopic)?.description || 
                         TOPIC_DESCRIPTIONS[expandedTopic] || 
                         'Un aspetto importante del tuo benessere.'}
                      </p>
                    </div>
                    <button 
                      onClick={() => setExpandedTopic(null)}
                      className="p-1 rounded-full hover:bg-muted transition-colors shrink-0"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_TOPICS.slice(0, 4).map((topic, index) => (
            <motion.button
              key={topic.tag}
              onClick={() => handleTopicClick(topic.tag)}
              className={cn(
                "px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200",
                "cursor-pointer text-left w-full",
                "bg-muted/50 text-muted-foreground border-muted/30"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center justify-between">
                <span className="capitalize truncate">{topic.tag}</span>
                <Sparkles className="w-3 h-3 opacity-50" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FocusTopics;
