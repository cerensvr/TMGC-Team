import { Product, ProductDraft } from '../types';
import { openBeautyFactsService } from './openBeautyFactsService';
import { apiFetch } from './apiClient';
import { API_PRODUCTS_URL } from './apiConfig';
import { errorDev, warnDev } from './logger';

type ScanInput = {
  barcode?: string;
  imageData?: unknown;
};

// İsteğe gönderilecek JSON body'yi güvenli şekilde hazırlayan yardımcı fonksiyon
const toRequest = (product: Omit<Product, 'id'> | Partial<Product>) => {
  const payload: Record<string, any> = {};

  // Sadece gönderilen (undefined olmayan) alanları ekleyerek veritabanında veri kaybını önler
  if (product.name !== undefined) payload.name = product.name.trim();
  if (product.brand !== undefined) payload.brand = product.brand.trim();
  if (product.category !== undefined) payload.category = product.category;
  if (product.timeOfDay !== undefined) payload.timeOfDay = product.timeOfDay;
  if (product.imageUrl !== undefined) payload.imageUrl = product.imageUrl || '';
  if (product.cutoutImageUrl !== undefined) payload.cutoutImageUrl = product.cutoutImageUrl || null;
  if (product.description !== undefined) payload.description = product.description || null;
  if (product.expiryDate !== undefined) payload.expiryDate = product.expiryDate || null;
  if (product.activeIngredients !== undefined) payload.activeIngredients = product.activeIngredients;
  if (product.isFavorite !== undefined) payload.isFavorite = product.isFavorite;
  if (product.isActive !== undefined) payload.isActive = product.isActive;

  return payload;
};

export const productService = {
  // Tüm dolap ürünlerini getirir
  getProducts: async (): Promise<Product[]> => {
    return apiFetch<Product[]>(API_PRODUCTS_URL);
  },

  // ID ile tek bir ürünü getirir
  getProduct: async (id: string): Promise<Product> => {
    return apiFetch<Product>(`${API_PRODUCTS_URL}/${id}`);
  },

  // Dolaba yeni ürün ekler
  addProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    return apiFetch<Product>(API_PRODUCTS_URL, {
      method: 'POST',
      body: toRequest(product),
    });
  },

  // Var olan ürünü günceller (Favori, Aktiflik durumu vb.)
  updateProduct: async (id: string, product: Partial<Product>): Promise<Product> => {
    return apiFetch<Product>(`${API_PRODUCTS_URL}/${id}`, {
      method: 'PUT',
      body: toRequest(product),
    });
  },

  // Ürünü dolaptan siler
  deleteProduct: async (id: string): Promise<boolean> => {
    await apiFetch<void>(`${API_PRODUCTS_URL}/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  // Barkod sorgulayarak Open Beauty Facts veritabanından ürün bilgilerini çeker
  scanProduct: async (input: ScanInput | string): Promise<ProductDraft | null> => {
    const scanInput: ScanInput = typeof input === 'string' ? { barcode: input } : input;

    if (scanInput.barcode?.trim()) {
      const cleanBarcode = scanInput.barcode.trim();

      try {
        const product = await openBeautyFactsService.getProductByBarcode(cleanBarcode);
        if (product) return product;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);

        // 404 veya geçersiz barkod durumu yazılımsal çökme değil, beklenen bir durumdur
        if (errorMsg.includes('404') || errorMsg.includes('Geçersiz barkod')) {
          warnDev(`Open Beauty Facts: Barkod veritabanında bulunamadı (${cleanBarcode}).`);
        } else {
          errorDev('Open Beauty Facts tarama hatası:', error);
        }
      }
    }

    warnDev('Ürün tarama desteklenen bir barkod içermiyor veya sonuç dönmedi.');
    return null;
  },
};