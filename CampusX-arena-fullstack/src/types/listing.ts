export interface UiListing {
  id: string;
  sourceType: "housing" | "market" | "board";
  title: string;
  price: string;
  priceUnit: string;
  location: string;
  distance: string;
  tag: string;
  tags: string[];
  author: string;
  authorId?: string;
  timeAgo: string;
  description: string;
  saved?: boolean;
  raw?: unknown;
}

export interface HousingListingDoc {
  id: string;
  title: string;
  description?: string;
  roomType?: string;
  rent?: number;
  deposit?: number;
  furnishing?: string;
  preferTenants?: string;
  formattedAddress?: string;
  location?: string;
  distanceLabel?: string;
  travelDistanceLabel?: string;
  status?: string;
  postedBy: string;
  photos?: string[];
  createdAt?: { toMillis?: () => number };
}

export interface MarketListingDoc {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price?: number;
  condition?: string;
  formattedAddress?: string;
  status?: string;
  postedBy: string;
  photos?: string[];
  createdAt?: { toMillis?: () => number };
}
