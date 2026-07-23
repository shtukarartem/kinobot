import { config } from '../config.js';
import type { MovieSearchResult, MovieType, PoiskKinoClient } from '../types/poiskkino.js';
import { PoiskKinoApiError } from '../types/poiskkino.js';

const API_BASE_URL = 'https://api.poiskkino.dev';
const DEFAULT_SEARCH_LIMIT = 5;
const REQUEST_TIMEOUT_MS = 10_000;

interface PoiskKinoSearchResponse {
  docs?: unknown[];
}

interface PoiskKinoMovieDto {
  id?: unknown;
  name?: unknown;
  alternativeName?: unknown;
  enName?: unknown;
  type?: unknown;
  year?: unknown;
  description?: unknown;
  shortDescription?: unknown;
  rating?: {
    kp?: unknown;
    imdb?: unknown;
  };
  poster?: {
    url?: unknown;
  };
}

const movieTypes = new Set<MovieType>([
  'movie',
  'tv-series',
  'cartoon',
  'animated-series',
  'anime',
  'tv-show',
]);

class HttpPoiskKinoClient implements PoiskKinoClient {
  public async search(query: string, limit = DEFAULT_SEARCH_LIMIT): Promise<MovieSearchResult[]> {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      return [];
    }

    const params = new URLSearchParams({
      query: normalizedQuery,
      page: '1',
      limit: Math.min(Math.max(limit, 1), 10).toString(),
    });

    const response = await this.request<PoiskKinoSearchResponse>(
      `/v1.4/movie/search?${params.toString()}`,
    );

    return Array.isArray(response.docs)
      ? response.docs
          .map(normalizeMovie)
          .filter((movie): movie is MovieSearchResult => movie !== null)
      : [];
  }

  public async getById(id: number): Promise<MovieSearchResult | null> {
    const response = await this.request<PoiskKinoMovieDto>(`/v1.4/movie/${id}`);
    return normalizeMovie(response);
  }

  private async request<T>(path: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          'X-API-KEY': config.poiskkinoApiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new PoiskKinoApiError(
          `PoiskKino API request failed with ${response.status}`,
          response.status,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof PoiskKinoApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new PoiskKinoApiError('PoiskKino API request timed out', 408);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function normalizeMovie(raw: unknown): MovieSearchResult | null {
  if (!isMovieDto(raw) || typeof raw.id !== 'number') {
    return null;
  }

  const name =
    getOptionalString(raw.name) ??
    getOptionalString(raw.alternativeName) ??
    getOptionalString(raw.enName);

  return {
    poiskkinoId: raw.id,
    name: name ?? 'Без названия',
    alternativeName: getOptionalString(raw.alternativeName),
    enName: getOptionalString(raw.enName),
    type: getMovieType(raw.type),
    year: getOptionalNumber(raw.year),
    description: getOptionalString(raw.description),
    shortDescription: getOptionalString(raw.shortDescription),
    ratingKp: getOptionalNumber(raw.rating?.kp),
    ratingImdb: getOptionalNumber(raw.rating?.imdb),
    posterUrl: getOptionalString(raw.poster?.url),
  };
}

function isMovieDto(value: unknown): value is PoiskKinoMovieDto {
  return typeof value === 'object' && value !== null;
}

function getOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getMovieType(value: unknown): MovieType | null {
  return typeof value === 'string' && movieTypes.has(value as MovieType)
    ? (value as MovieType)
    : null;
}

export const poiskKinoClient = new HttpPoiskKinoClient();
