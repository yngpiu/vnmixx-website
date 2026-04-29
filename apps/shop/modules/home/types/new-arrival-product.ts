export type NewArrivalProduct = {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  colorHexCodes: string[];
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
};
