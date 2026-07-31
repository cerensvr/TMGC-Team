import { ProductDraft } from '../types';
import { apiFetch } from './apiClient';
import { API_PRODUCTS_URL } from './apiConfig';
import { matchProductCutout } from './productVisualCatalog';

export type ProductRecognitionConfidence = 'high' | 'medium' | 'low';

type ProductRecognitionResponse = ProductDraft & {
  confidence: ProductRecognitionConfidence;
  matchedFromShelf: boolean;
};

type ProductPhotoInput = {
  imageBase64: string;
  imageMimeType: string;
};

export type ProductRecognitionResult = {
  product: ProductDraft;
  confidence: ProductRecognitionConfidence;
  matchedFromShelf: boolean;
};

export const recognizeProductPhoto = async (
  input: ProductPhotoInput
): Promise<ProductRecognitionResult> => {
  const response = await apiFetch<ProductRecognitionResponse>(`${API_PRODUCTS_URL}/recognize`, {
    method: 'POST',
    body: input,
  });

  return {
    product: {
      name: response.name,
      brand: response.brand,
      category: response.category,
      timeOfDay: response.timeOfDay,
      imageUrl: response.imageUrl || '',
      cutoutImageUrl:
        response.cutoutImageUrl || matchProductCutout(response.brand, response.name),
      description: response.description || '',
      activeIngredients: response.activeIngredients || [],
    },
    confidence: response.confidence,
    matchedFromShelf: response.matchedFromShelf,
  };
};
