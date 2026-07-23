export type MovieType = 'movie' | 'tv-series' | 'cartoon' | 'animated-series' | 'anime' | 'tv-show';

export interface MovieSearchResult {
  poiskkinoId: number;
  name: string;
  alternativeName: string | null;
  enName: string | null;
  type: MovieType | null;
  year: number | null;
  description: string | null;
  shortDescription: string | null;
  ratingKp: number | null;
  ratingImdb: number | null;
  posterUrl: string | null;
}

export interface PoiskKinoClient {
  search(query: string, limit?: number): Promise<MovieSearchResult[]>;
  getById(id: number): Promise<MovieSearchResult | null>;
}

export class PoiskKinoApiError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'PoiskKinoApiError';
  }
}
