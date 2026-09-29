export type Author = {
  name: string;
  url?: string;
  institution?: string;
  institutionIndices?: number[];
  notes?: string[];
};

export type Institution = {
  index: number;
  name: string;
  logo?: string;
  logoWidth?: number;
  logoHeight?: number;
};

export type Link = {
  url: string;
  name: string;
  icon?: string;
};

export type Note = {
  symbol: string;
  text: string;
};
