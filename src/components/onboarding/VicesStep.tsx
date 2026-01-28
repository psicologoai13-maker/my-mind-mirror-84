import React from 'react';
import ChipGridStep from './ChipGridStep';

interface VicesStepProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const vicesOptions = [
  { id: 'smoking', label: 'Fumo', emoji: '🚬' },
  { id: 'alcohol', label: 'Alcol', emoji: '🍷' },
  { id: 'caffeine', label: 'Troppo caffè', emoji: '☕' },
  { id: 'sugar', label: 'Zuccheri', emoji: '🍬' },
  { id: 'social_media', label: 'Social Media', emoji: '📱' },
  { id: 'nail_biting', label: 'Mangiarsi unghie', emoji: '💅' },
  { id: 'procrastination', label: 'Procrastinazione', emoji: '⏰' },
  { id: 'junk_food', label: 'Cibo spazzatura', emoji: '🍔' },
  { id: 'gaming', label: 'Troppi videogiochi', emoji: '🎮' },
  { id: 'shopping', label: 'Shopping compulsivo', emoji: '🛍️' },
];

const VicesStep: React.FC<VicesStepProps> = ({ selectedValues, onChange }) => {
  return (
    <ChipGridStep
      title="Hai qualche 'vizio'?"
      subtitle="Seleziona quelli che vuoi tenere sotto controllo (opzionale)"
      encouragement="Nessun giudizio, solo supporto! 💪"
      options={vicesOptions}
      selectedValues={selectedValues}
      onChange={onChange}
      showNoneOption
      noneOptionId="none"
      noneOptionLabel="Nessuno di questi"
    />
  );
};

export default VicesStep;
