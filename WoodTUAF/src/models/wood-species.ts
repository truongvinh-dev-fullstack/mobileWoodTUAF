export type WoodSpecies = {
  scientificName: string;
  htmlContent: string;
  vietnameseName?: string;
};

export type WoodSpeciesApiItem = {
  scientific_name?: string | null;
  html_content?: string | null;
};
