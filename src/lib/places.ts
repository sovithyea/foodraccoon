export function mapPriceLevel(level?: number): number | null {
  if (level == null) return null;
  return Math.max(1, Math.min(4, level));
}

export function inferCuisineTypes(types: string[], name: string): string[] {
  const cuisines: string[] = [];
  const nameLower = name.toLowerCase();

  const typeMap: Record<string, string> = {
    cafe: "Cafe",
    bakery: "Cafe",
    bar: "Bar",
    night_club: "Bar",
    meal_takeaway: "Street food",
    meal_delivery: "Street food",
  };
  const nameMap: Record<string, string> = {
    pizza: "Pizza",
    sushi: "Japanese",
    ramen: "Japanese",
    burger: "Western",
    steak: "Western",
    grill: "Western",
    khmer: "Khmer",
    cambodia: "Khmer",
    pho: "Vietnamese",
    viet: "Vietnamese",
    thai: "Thai",
    indian: "Indian",
    italian: "Italian",
    pasta: "Italian",
    coffee: "Cafe",
    cafe: "Cafe",
    bakery: "Cafe",
    noodle: "Noodles",
    vegan: "Vegan",
    vegetarian: "Vegetarian",
    chinese: "Chinese",
    korean: "Korean",
    asian: "Asian",
    bbq: "BBQ",
    seafood: "Seafood",
  };

  for (const [key, val] of Object.entries(typeMap)) {
    if (types.includes(key) && !cuisines.includes(val)) cuisines.push(val);
  }
  for (const [key, val] of Object.entries(nameMap)) {
    if (nameLower.includes(key) && !cuisines.includes(val)) cuisines.push(val);
  }

  if (cuisines.length === 0) cuisines.push("International");
  return cuisines;
}

export function inferDistrict(lat: number, lng: number): string {
  if (lng > 104.925 && lat > 11.565) return "Riverside";
  if (lng > 104.915 && lng < 104.930 && lat > 11.555 && lat < 11.575) return "BKK1";
  if (lng > 104.910 && lng < 104.925 && lat > 11.550 && lat < 11.565) return "BKK2";
  if (lat < 11.545 && lng > 104.910) return "Chamkarmon";
  if (lat > 11.575 && lng < 104.915) return "Toul Kork";
  if (lng < 104.900) return "Sen Sok";
  if (lat > 11.560 && lng > 104.925) return "Daun Penh";
  if (lat < 11.535) return "Mean Chey";
  return "Toul Tom Poung";
}
