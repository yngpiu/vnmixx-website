export type NewArrivalProduct = {
  id: number;
  name: string;
  slug: string;
  thumbnail: string | null;
  minPrice: number | null;
  maxPrice: number | null;
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
};
