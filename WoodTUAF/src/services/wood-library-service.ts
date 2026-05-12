import AsyncStorage from '@react-native-async-storage/async-storage';
import type {WoodSpecies, WoodSpeciesApiItem} from '../models/wood-species';

const WOOD_API_URL =
  'http://tuaf.tringhiatech.vn/wood/index_get?key=9061f27544ec0703a50aa4a13afc63e73683fece';
const LEGACY_CACHE_KEY = 'responseJson';
const CACHE_KEY = 'woodSpeciesCache';

const decodeHtmlEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

const stripHtml = (html: string) =>
  decodeHtmlEntities(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

export const parseVietnameseName = (htmlContent?: string | null) => {
  if (!htmlContent) {
    return undefined;
  }

  const text = stripHtml(htmlContent);
  const patterns = [
    /Tên\s*loài\s*\(Tiếng\s*Việt\)\s*:?\s*([^:|]+?)(?=\s+Tên\s+loài|\s+Tên\s+khoa|\s+Tên\s+thương|\s+Họ\s|$)/i,
    /Tên\s*phổ\s*thông\s*:?\s*([^:|]+?)(?=\s+Tên\s+loài|\s+Tên\s+khoa|\s+Tên\s+thương|\s+Họ\s|$)/i,
    /Tên\s*Việt\s*Nam\s*:?\s*([^:|]+?)(?=\s+Tên\s+loài|\s+Tên\s+khoa|\s+Tên\s+thương|\s+Họ\s|$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const name = match?.[1]?.trim();
    if (name) {
      return name;
    }
  }

  return undefined;
};

const normalizeSpecies = (items: WoodSpeciesApiItem[] = []): WoodSpecies[] =>
  items
    .filter(item => item?.scientific_name && item?.html_content)
    .map(item => ({
      scientificName: String(item.scientific_name),
      htmlContent: String(item.html_content),
      vietnameseName: parseVietnameseName(item.html_content),
    }));

export const woodSpeciesToLegacy = (items: WoodSpecies[]) =>
  items.map(item => ({
    scientific_name: item.scientificName,
    html_content: item.htmlContent,
    vietnameseName: item.vietnameseName,
  }));

export const getCachedWoodSpecies = async (): Promise<WoodSpecies[]> => {
  const cached =
    (await AsyncStorage.getItem(CACHE_KEY)) ||
    (await AsyncStorage.getItem(LEGACY_CACHE_KEY));
  if (!cached) {
    return [];
  }

  try {
    const parsed = JSON.parse(cached);
    return normalizeSpecies(parsed);
  } catch (error) {
    console.error('getCachedWoodSpecies error:', error);
    return [];
  }
};

export const fetchWoodSpecies = async (): Promise<WoodSpecies[]> => {
  const response = await fetch(WOOD_API_URL);
  if (!response.ok) {
    throw new Error(`Wood API failed with status ${response.status}`);
  }

  const json = await response.json();
  const items = normalizeSpecies(Array.isArray(json) ? json : []);
  const legacyPayload = woodSpeciesToLegacy(items);
  await AsyncStorage.multiSet([
    [CACHE_KEY, JSON.stringify(legacyPayload)],
    [LEGACY_CACHE_KEY, JSON.stringify(legacyPayload)],
  ]);
  return items;
};

export const loadWoodSpeciesWithRefresh = async (
  onRefresh?: (items: WoodSpecies[]) => void,
) => {
  const cached = await getCachedWoodSpecies();

  fetchWoodSpecies()
    .then(items => onRefresh?.(items))
    .catch(error => console.error('refresh wood species error:', error));

  return cached;
};
