export type Media = {
  id: number;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  title?: string;
  name?: string;
};

export type Genre = {
  id: number;
  name: string;
};

export type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

export type CrewMember = {
  id: number;
  name: string;
  job: string;
};

export type MediaDetail = {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  tagline?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genres: Genre[];
  vote_average: number;
  vote_count: number;
  status: string;
  original_language: string;
  release_date?: string;
  runtime?: number;
  first_air_date?: string;
  number_of_seasons?: number;
  number_of_episodes?: number;
  episode_run_time?: number[];
  credits: {
    cast: CastMember[];
    crew: CrewMember[];
  };
};

export type User = {
  id: number;
  username: string;
  email: string;
};