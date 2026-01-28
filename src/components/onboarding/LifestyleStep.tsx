import React from 'react';
import ChipGridStep from './ChipGridStep';

interface LifestyleStepProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const lifestyleOptions = [
  { id: 'active_sport', label: 'Faccio sport', emoji: '🏃' },
  { id: 'meditation', label: 'Pratico meditazione', emoji: '🧘' },
  { id: 'sleep_issues', label: 'Problemi di sonno', emoji: '😴' },
  { id: 'low_water', label: 'Bevo poca acqua', emoji: '💧' },
  { id: 'healthy_eating', label: 'Mangio sano', emoji: '🍎' },
  { id: 'reading', label: 'Leggo spesso', emoji: '📚' },
  { id: 'social_life', label: 'Vita sociale attiva', emoji: '👥' },
  { id: 'alone_time', label: 'Passo tempo solo/a', emoji: '🏠' },
  { id: 'outdoor', label: 'Sto spesso all\'aperto', emoji: '🌳' },
  { id: 'creative', label: 'Attività creative', emoji: '🎨' },
  { id: 'work_stress', label: 'Lavoro stressante', emoji: '💼' },
  { id: 'student', label: 'Sto studiando', emoji: '📖' },
];

const LifestyleStep: React.FC<LifestyleStepProps> = ({ selectedValues, onChange }) => {
  return (
    <ChipGridStep
      title="Com'è il tuo stile di vita?"
      subtitle="Seleziona tutto ciò che ti descrive"
      encouragement="Ottimo! Questo mi aiuta a conoscerti meglio ✨"
      options={lifestyleOptions}
      selectedValues={selectedValues}
      onChange={onChange}
    />
  );
};

export default LifestyleStep;
