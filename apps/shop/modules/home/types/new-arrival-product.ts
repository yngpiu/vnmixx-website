/** Listing payload for one variant color: URLs come from gallery rows tied to this color id only. */
export type ProductListColor = {
  id: number;
  name: string;
  hexCode: string;
  /** This color gallery, lowest sort_order (front). */
  frontUrl: string | null;
  /** This color gallery, second sort_order (back). */
  backUrl: string | null;
};

export type NewArrivalProduct = {
  id: number;
  name: string;
  slug: string;
  minPrice: number | null;
  maxPrice: number | null;
  /** Variant colors on listing cards: front/back URL per color only (max 4 colors). */
  colors: ProductListColor[];
  /** Public active variants used for size picker and add-to-cart on listing cards. */
  variants?: {
    id: number;
    price: number;
    compareAtPrice: number | null;
    onHand: number;
    reserved: number;
    color: {
      id: number;
      name: string;
      hexCode: string;
    };
    size: {
      id: number;
      label: string;
      /** Listing sort order from API (required for size picker ordering). */
      sortOrder: number;
    };
  }[];
  category: {
    id: number;
    name: string;
    slug: string;
  } | null;
};
