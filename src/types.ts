export interface PlantAnalysisResult {
  plantName: string;
  status: 'Healthy' | 'Leaf Spot' | 'Yellow Leaf' | 'Fungus' | 'Pest Infestation' | 'Beneficial Insects Found' | 'Unknown';
  confidence: number;
  suggestions: string[];
  description: string;
  symptoms?: string;
  treatment?: string;
}
