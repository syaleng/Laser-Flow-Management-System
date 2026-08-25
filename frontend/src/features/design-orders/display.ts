const legacyCategoryNames = new Set([
  "Women's shirt decoration",
  "Scarf/Tukri decoration",
  "Collar pattern",
  "Sleeve pattern",
  "Decorative pieces",
  "Custom design",
]);

export function isPreparedDesign(name: string): boolean {
  return !legacyCategoryNames.has(name);
}

export function designCategoryLabel(name: string): string {
  return name;
}
