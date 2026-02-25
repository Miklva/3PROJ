export type Media = {
  id: number;
  poster_path: string | null;
  title?: string;
  name?: string;
};

export type User = {
  id: number;
  username: string;
  email: string;
};