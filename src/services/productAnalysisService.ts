import { ProductDraft } from '../types';
import { apiFetch } from './apiClient';
import { API_BASE_URL } from './apiConfig';

export type ProductIngredientAnalysis = {
  summary: string;
  compatibilityLevel: 'high' | 'warning' | 'synergy';
  compatibilityMessage: string;
  suggestedTimeOfDay: 'morning' | 'evening' | 'both';
  notableIngredients: string[];
  warnings: string[];
  conflicts: {
    productId: number;
    productName: string;
    trigger: string;
    severity: 'high' | 'warning';
    recommendation: string;
  }[];
};

type ProductAnalysisInput = Pick<
  ProductDraft,
  'name' | 'brand' | 'category' | 'description' | 'activeIngredients'
>;

export const analyzeProductIngredients = async (product: ProductAnalysisInput): Promise<ProductIngredientAnalysis> => {
  return apiFetch<ProductIngredientAnalysis>(`${API_BASE_URL}/assistant/analyze-ingredients`, {
    method: 'POST',
    body: {
      name: product.name,
      brand: product.brand,
      category: product.category,
      description: product.description,
      activeIngredients: product.activeIngredients ?? [],
    },
  });
};
