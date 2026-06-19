export type SearchResult = {
  id: string;
  name: string;
  address: string | null;
  district: string | null;
  latitude: number;
  longitude: number;
  cuisine_type: string[];
  price_range: number | null;
  google_rating: number | null;
  matchedDish?: string;
  matchedCuisine?: string;
};

export type SearchResponse = {
  restaurants: SearchResult[];
  cuisineMatches: SearchResult[];
  districtMatches: SearchResult[];
  dishMatches: SearchResult[];
};
