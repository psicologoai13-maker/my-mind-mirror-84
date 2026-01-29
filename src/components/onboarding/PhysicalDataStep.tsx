import React from 'react';
import { Input } from '@/components/ui/input';
import { Scale, Ruler, Calendar, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhysicalData {
  weight?: number;
  height?: number;
  birthYear?: number;
  gender?: string;
  therapyStatus?: string;
}

interface PhysicalDataStepProps {
  value: PhysicalData;
  onChange: (data: PhysicalData) => void;
}

const PhysicalDataStep: React.FC<PhysicalDataStepProps> = ({ value, onChange }) => {
  const handleChange = (field: keyof PhysicalData, inputValue: string | number | undefined) => {
    onChange({
      ...value,
      [field]: inputValue,
    });
  };

  const handleNumericChange = (field: keyof PhysicalData, inputValue: string) => {
    const numValue = inputValue ? parseFloat(inputValue) : undefined;
    handleChange(field, numValue);
  };

  const numericFields = [
    {
      key: 'weight' as const,
      label: 'Peso attuale',
      icon: Scale,
      unit: 'kg',
      placeholder: '70',
      min: 30,
      max: 300,
    },
    {
      key: 'height' as const,
      label: 'Altezza',
      icon: Ruler,
      unit: 'cm',
      placeholder: '170',
      min: 100,
      max: 250,
    },
    {
      key: 'birthYear' as const,
      label: 'Anno di nascita',
      icon: Calendar,
      unit: '',
      placeholder: '1990',
      min: 1920,
      max: new Date().getFullYear() - 10,
    },
  ];

  const genderOptions = [
    { value: 'male', label: 'Maschio' },
    { value: 'female', label: 'Femmina' },
    { value: 'other', label: 'Altro' },
    { value: 'prefer_not_say', label: 'Preferisco non dire' },
  ];

  const therapyOptions = [
    { value: 'none', label: 'No, mai' },
    { value: 'past', label: 'In passato' },
    { value: 'current', label: 'Attualmente' },
  ];

  return (
    <div className="flex-1 flex flex-col px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground leading-tight mb-2">
          Dati fisici
        </h1>
        <p className="text-base text-muted-foreground">
          Questi dati aiuteranno Aria a darti consigli più precisi (opzionale)
        </p>
      </div>

      {/* Input Fields */}
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Numeric Fields */}
        {numericFields.map((field, index) => {
          const Icon = field.icon;
          const hasValue = value[field.key] !== undefined;
          
          return (
            <div
              key={field.key}
              className={cn(
                "p-4 rounded-2xl bg-card shadow-soft transition-all duration-300 animate-slide-up",
                hasValue && "shadow-premium"
              )}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                  hasValue ? "bg-primary/10" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "w-5 h-5 transition-colors",
                    hasValue ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {field.label}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={value[field.key] ?? ''}
                  onChange={(e) => handleNumericChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                  className="h-14 text-2xl text-center rounded-xl border-2 border-transparent focus:border-primary bg-background"
                />
                {field.unit && (
                  <span className="text-lg font-medium text-muted-foreground min-w-[40px]">
                    {field.unit}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Gender Selection */}
        <div
          className={cn(
            "p-4 rounded-2xl bg-card shadow-soft transition-all duration-300 animate-slide-up",
            value.gender && "shadow-premium"
          )}
          style={{ animationDelay: `${numericFields.length * 0.1}s` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              value.gender ? "bg-primary/10" : "bg-muted"
            )}>
              <User className={cn(
                "w-5 h-5 transition-colors",
                value.gender ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Genere
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {genderOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange('gender', option.value)}
                className={cn(
                  "py-3 px-4 rounded-xl text-sm font-medium transition-all",
                  value.gender === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Therapy Status */}
        <div
          className={cn(
            "p-4 rounded-2xl bg-card shadow-soft transition-all duration-300 animate-slide-up",
            value.therapyStatus && "shadow-premium"
          )}
          style={{ animationDelay: `${(numericFields.length + 1) * 0.1}s` }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
              value.therapyStatus ? "bg-primary/10" : "bg-muted"
            )}>
              <Heart className={cn(
                "w-5 h-5 transition-colors",
                value.therapyStatus ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <span className="text-sm font-medium text-foreground">
              Segui una terapia psicologica?
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {therapyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleChange('therapyStatus', option.value)}
                className={cn(
                  "py-3 px-3 rounded-xl text-sm font-medium transition-all",
                  value.therapyStatus === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <p className="text-xs text-center text-muted-foreground mt-4">
        🔒 I tuoi dati sono privati e sicuri. Puoi saltare questo step.
      </p>
    </div>
  );
};

export default PhysicalDataStep;
