// Real-time context utilities for Aria

interface DateTimeContext {
  date: string;          // "27 gennaio 2026"
  day: string;           // "Lunedì"
  time: string;          // "15:32"
  period: string;        // "mattina" | "pomeriggio" | "sera" | "notte"
  season: string;        // "inverno" | "primavera" | "estate" | "autunno"
  holiday?: string;      // Italian holidays
}

interface LocationContext {
  city?: string;
  region?: string;
  country?: string;
}

interface RealTimeContext {
  datetime: DateTimeContext;
  location?: LocationContext;
  weather?: {
    condition: string;
    temperature: number;
    feels_like: number;
    description: string;
  };
  news?: {
    headlines: string[];
  };
}

// Italian day names
const DAYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// Italian month names
const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

// Italian holidays (fixed dates)
const HOLIDAYS_IT: Record<string, string> = {
  '01-01': 'Capodanno',
  '01-06': 'Epifania',
  '04-25': 'Festa della Liberazione',
  '05-01': 'Festa dei Lavoratori',
  '06-02': 'Festa della Repubblica',
  '08-15': 'Ferragosto',
  '11-01': 'Tutti i Santi',
  '12-08': 'Immacolata Concezione',
  '12-25': 'Natale',
  '12-26': 'Santo Stefano',
  '12-31': 'San Silvestro',
};

function getDateTimeContext(date: Date = new Date()): DateTimeContext {
  const day = DAYS_IT[date.getDay()];
  const dayNum = date.getDate();
  const month = MONTHS_IT[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  // Determine period of day
  let period: string;
  if (hours >= 5 && hours < 12) period = 'mattina';
  else if (hours >= 12 && hours < 18) period = 'pomeriggio';
  else if (hours >= 18 && hours < 22) period = 'sera';
  else period = 'notte';
  
  // Determine season
  const monthNum = date.getMonth();
  let season: string;
  if (monthNum >= 2 && monthNum <= 4) season = 'primavera';
  else if (monthNum >= 5 && monthNum <= 7) season = 'estate';
  else if (monthNum >= 8 && monthNum <= 10) season = 'autunno';
  else season = 'inverno';
  
  // Check for holidays
  const monthDay = `${(date.getMonth() + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
  const holiday = HOLIDAYS_IT[monthDay];
  
  return {
    date: `${dayNum} ${month} ${year}`,
    day,
    time: `${hours}:${minutes}`,
    period,
    season,
    holiday
  };
}

export function buildRealTimeContextBlock(
  location?: { lat: number; lon: number; city?: string; region?: string; country?: string } | null,
  weather?: { condition: string; temperature: number; feels_like: number; description: string } | null,
  news?: string[] | null
): string {
  const datetime = getDateTimeContext();
  
  let contextBlock = `
═══════════════════════════════════════════════
📍 CONTESTO TEMPO REALE
═══════════════════════════════════════════════

DATA/ORA: ${datetime.day} ${datetime.date}, ore ${datetime.time} (${datetime.period}, ${datetime.season})`;

  if (datetime.holiday) {
    contextBlock += `\n🎉 OGGI È: ${datetime.holiday}`;
  }

  if (location?.city) {
    contextBlock += `\n\nPOSIZIONE UTENTE: ${location.city}${location.region ? `, ${location.region}` : ''}${location.country ? `, ${location.country}` : ''}`;
  }

  if (weather) {
    contextBlock += `\n\nMETEO ATTUALE: ${weather.condition}, ${Math.round(weather.temperature)}°C (percepiti ${Math.round(weather.feels_like)}°C)
- ${weather.description}`;
  }

  if (news && news.length > 0) {
    contextBlock += `\n\nULTIME NOTIZIE ITALIA:
${news.map(n => `- ${n}`).join('\n')}`;
  }

  contextBlock += `

USO DEL CONTESTO:
- Usa questi dati solo se PERTINENTI alla conversazione
- NON forzare queste info se l'utente ha un problema urgente
- Puoi commentare naturalmente: "Con questo tempo...", "Sono le ${datetime.time}, è tardi..."
- Per contestualizzare: orario (${datetime.period}), stagione (${datetime.season})
- NON iniziare con meteo/news se l'utente è in difficoltà
`;

  return contextBlock;
}

export function getMinimalContextBlock(): string {
  const datetime = getDateTimeContext();
  
  return `
═══════════════════════════════════════════════
📍 CONTESTO TEMPO REALE
═══════════════════════════════════════════════

DATA/ORA: ${datetime.day} ${datetime.date}, ore ${datetime.time} (${datetime.period}, ${datetime.season})${datetime.holiday ? `\n🎉 OGGI È: ${datetime.holiday}` : ''}

Usa questi dati per contestualizzare (orario, giorno della settimana, stagione).
`;
}
