/**
 * 天气数据层
 * ---------------------------------------------------------------
 * 在构建阶段（服务器端）拉取一次预报数据并写入 HTML，因此：
 *   1. 无 JS 的访客与搜索引擎都能看到完整天气内容；
 *   2. 同一轮构建内所有语言页面共享同一次请求（模块级缓存）。
 * 页面加载后由 Weather.astro 中的轻量脚本做静默增量刷新，
 * 保证访客看到的是最新实况。
 */
import { attraction } from '../config/attraction';

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  isDay: boolean;
}

export interface DailyWeather {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationProbability: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyWeather[];
  fetchedAt: string;
  timezone: string;
}

/** WMO 天气现象分组，用于映射图标与多语言描述 */
export type WeatherGroup =
  | 'clear'
  | 'mainlyClear'
  | 'partlyCloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'freezingDrizzle'
  | 'rain'
  | 'freezingRain'
  | 'snow'
  | 'snowGrains'
  | 'rainShowers'
  | 'snowShowers'
  | 'thunderstorm'
  | 'thunderstormHail';

/** 供前端刷新脚本复用的映射表（避免客户端重复维护逻辑） */
export const wmoGroups: Record<number, WeatherGroup> = {
  0: 'clear',
  1: 'mainlyClear',
  2: 'partlyCloudy',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'freezingDrizzle',
  57: 'freezingDrizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'freezingRain',
  67: 'freezingRain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snowGrains',
  80: 'rainShowers',
  81: 'rainShowers',
  82: 'rainShowers',
  85: 'snowShowers',
  86: 'snowShowers',
  95: 'thunderstorm',
  96: 'thunderstormHail',
  99: 'thunderstormHail',
};

export const weatherGroup = (code: number): WeatherGroup => wmoGroups[code] ?? 'partlyCloudy';

/** 供前端刷新脚本复用的图标表 */
export const weatherIcons: Record<WeatherGroup, { day: string; night: string }> = {
  clear: { day: '☀️', night: '🌙' },
  mainlyClear: { day: '🌤️', night: '🌙' },
  partlyCloudy: { day: '⛅', night: '☁️' },
  overcast: { day: '☁️', night: '☁️' },
  fog: { day: '🌫️', night: '🌫️' },
  drizzle: { day: '🌦️', night: '🌦️' },
  freezingDrizzle: { day: '🌧️', night: '🌧️' },
  rain: { day: '🌧️', night: '🌧️' },
  freezingRain: { day: '🌧️', night: '🌧️' },
  snow: { day: '🌨️', night: '🌨️' },
  snowGrains: { day: '❄️', night: '❄️' },
  rainShowers: { day: '🌦️', night: '🌦️' },
  snowShowers: { day: '🌨️', night: '🌨️' },
  thunderstorm: { day: '⛈️', night: '⛈️' },
  thunderstormHail: { day: '⛈️', night: '⛈️' },
};

export const weatherIcon = (group: WeatherGroup, isDay = true): string =>
  isDay ? weatherIcons[group].day : weatherIcons[group].night;

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/** 请求参数汇总，构建期与浏览器端刷新共用同一份定义 */
export function weatherApiUrl(): string {
  const params = new URLSearchParams({
    latitude: String(attraction.latitude),
    longitude: String(attraction.longitude),
    current:
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,is_day',
    daily:
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset',
    timezone: attraction.timezone,
    forecast_days: '7',
    wind_speed_unit: 'ms',
  });
  return `${ENDPOINT}?${params.toString()}`;
}

const num = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** 把接口原始响应规整为前端使用的结构（构建期与浏览器端复用） */
export function normalizeWeather(payload: any): WeatherData | null {
  const current = payload?.current;
  const daily = payload?.daily;
  if (!current || !daily?.time?.length) return null;

  return {
    timezone: payload.timezone ?? attraction.timezone,
    fetchedAt: new Date().toISOString(),
    current: {
      temperature: num(current.temperature_2m),
      apparentTemperature: num(current.apparent_temperature),
      humidity: num(current.relative_humidity_2m),
      precipitation: num(current.precipitation),
      weatherCode: num(current.weather_code),
      windSpeed: num(current.wind_speed_10m),
      isDay: num(current.is_day, 1) === 1,
    },
    daily: daily.time.map((date: string, i: number) => ({
      date,
      weatherCode: num(daily.weather_code?.[i]),
      tempMax: num(daily.temperature_2m_max?.[i]),
      tempMin: num(daily.temperature_2m_min?.[i]),
      precipitationProbability: num(daily.precipitation_probability_max?.[i]),
      uvIndexMax: num(daily.uv_index_max?.[i]),
      sunrise: daily.sunrise?.[i] ?? '',
      sunset: daily.sunset?.[i] ?? '',
    })),
  };
}

let pending: Promise<WeatherData | null> | null = null;

const load = async (): Promise<WeatherData | null> => {
  try {
    const res = await fetch(weatherApiUrl(), {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`weather api responded ${res.status}`);
    return normalizeWeather(await res.json());
  } catch (err) {
    // 构建环境无外网时不应导致构建失败，降级为“暂无数据”
    console.warn('[weather] 获取预报失败，将渲染降级状态：', (err as Error)?.message);
    return null;
  }
};

/** 构建期调用；模块级缓存保证一次构建只请求一次 */
export function getWeather(): Promise<WeatherData | null> {
  if (!pending) pending = load();
  return pending;
}

/** 依据降水概率给出是否带伞的建议档位 */
export function umbrellaLevel(probability: number): 'high' | 'medium' | 'low' {
  if (probability >= 60) return 'high';
  if (probability >= 30) return 'medium';
  return 'low';
}

/** 依据体感温度给出穿着建议档位 */
export function clothingLevel(apparent: number): 'hot' | 'warm' | 'mild' | 'cool' | 'cold' {
  if (apparent >= 30) return 'hot';
  if (apparent >= 24) return 'warm';
  if (apparent >= 15) return 'mild';
  if (apparent >= 8) return 'cool';
  return 'cold';
}
