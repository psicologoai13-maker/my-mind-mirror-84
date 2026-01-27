import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Italian day names
const DAYS_IT = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

// Italian month names
const MONTHS_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

// Italian holidays
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

interface RealTimeContext {
  datetime: {
    date: string;
    day: string;
    time: string;
    period: string;
    season: string;
    holiday?: string;
  };
  location?: {
    city: string;
    region: string;
    country: string;
  };
  weather?: {
    condition: string;
    temperature: number;
    feels_like: number;
    humidity: number;
    description: string;
  };
  news?: {
    headlines: string[];
    sports?: string[];
  };
}

function getDateTimeContext(timezone: string = 'Europe/Rome'): RealTimeContext['datetime'] {
  const now = new Date();
  
  // Format for Italian timezone
  const formatter = new Intl.DateTimeFormat('it-IT', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const parts = formatter.formatToParts(now);
  const partsMap: Record<string, string> = {};
  parts.forEach(p => partsMap[p.type] = p.value);
  
  const hours = parseInt(partsMap.hour || '12');
  const dayNum = parseInt(partsMap.day || '1');
  const monthNum = now.getMonth();
  
  // Period of day
  let period: string;
  if (hours >= 5 && hours < 12) period = 'mattina';
  else if (hours >= 12 && hours < 18) period = 'pomeriggio';
  else if (hours >= 18 && hours < 22) period = 'sera';
  else period = 'notte';
  
  // Season
  let season: string;
  if (monthNum >= 2 && monthNum <= 4) season = 'primavera';
  else if (monthNum >= 5 && monthNum <= 7) season = 'estate';
  else if (monthNum >= 8 && monthNum <= 10) season = 'autunno';
  else season = 'inverno';
  
  // Holiday check
  const monthDay = `${(monthNum + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
  const holiday = HOLIDAYS_IT[monthDay];
  
  // Capitalize first letter of weekday
  const day = (partsMap.weekday || 'lunedì').charAt(0).toUpperCase() + (partsMap.weekday || 'lunedì').slice(1);
  
  return {
    date: `${dayNum} ${partsMap.month} ${partsMap.year}`,
    day,
    time: `${partsMap.hour}:${partsMap.minute}`,
    period,
    season,
    holiday
  };
}

async function fetchWeather(lat: number, lon: number): Promise<RealTimeContext['weather'] | null> {
  const apiKey = Deno.env.get('OPENWEATHER_API_KEY');
  if (!apiKey) {
    console.log('[real-time-context] No OPENWEATHER_API_KEY configured');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=it&appid=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('[real-time-context] Weather API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    return {
      condition: data.weather?.[0]?.description || 'non disponibile',
      temperature: data.main?.temp || 0,
      feels_like: data.main?.feels_like || 0,
      humidity: data.main?.humidity || 0,
      description: `${data.weather?.[0]?.description || 'tempo non disponibile'}${data.main?.humidity > 70 ? ', umidità alta' : ''}`
    };
  } catch (error) {
    console.error('[real-time-context] Weather fetch error:', error);
    return null;
  }
}

async function fetchNews(): Promise<RealTimeContext['news'] | null> {
  const apiKey = Deno.env.get('WORLDNEWS_API_KEY');
  if (!apiKey) {
    console.log('[real-time-context] No WORLDNEWS_API_KEY configured');
    return null;
  }
  
  try {
    // WorldNewsAPI endpoint for top news
    const response = await fetch(
      `https://api.worldnewsapi.com/search-news?source-countries=it&language=it&number=5&api-key=${apiKey}`
    );
    
    if (!response.ok) {
      console.error('[real-time-context] WorldNews API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    
    const headlines = data.news?.slice(0, 5).map((a: any) => a.title) || [];
    
    return {
      headlines
    };
  } catch (error) {
    console.error('[real-time-context] WorldNews fetch error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lat, lon, user_id, timezone = 'Europe/Rome' } = await req.json();
    
    console.log('[real-time-context] Request:', { lat, lon, user_id, timezone });
    
    // Always get datetime context (no API needed)
    const datetime = getDateTimeContext(timezone);
    
    const context: RealTimeContext = {
      datetime
    };
    
    // Try to get location info if coordinates provided
    if (lat && lon) {
      try {
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
          { headers: { 'Accept-Language': 'it', 'User-Agent': 'Serenity-App/1.0' } }
        );
        
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          context.location = {
            city: geoData.address?.city || geoData.address?.town || geoData.address?.village || '',
            region: geoData.address?.state || '',
            country: geoData.address?.country || 'Italia'
          };
        }
      } catch (e) {
        console.warn('[real-time-context] Geocoding failed:', e);
      }
      
      // Try weather (optional - requires API key)
      const weather = await fetchWeather(lat, lon);
      if (weather) {
        context.weather = weather;
      }
    }
    
    // Try news (optional - requires API key)
    const news = await fetchNews();
    if (news) {
      context.news = news;
    }
    
    // Cache in user profile if user_id provided
    if (user_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('user_profiles')
          .update({
            realtime_context_cache: context,
            realtime_context_updated_at: new Date().toISOString()
          })
          .eq('user_id', user_id);
      }
    }
    
    return new Response(JSON.stringify(context), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('[real-time-context] Error:', error);
    
    // Return minimal context on error
    const fallback: RealTimeContext = {
      datetime: getDateTimeContext()
    };
    
    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
