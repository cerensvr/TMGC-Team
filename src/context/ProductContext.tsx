import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Product } from '../types';
import { productService } from '../services/productService';
import { errorDev } from '../services/logger';

interface ProductContextType {
  products: Product[];
  isLoading: boolean;
  loadError: string | null;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  loadProducts: () => Promise<void>;
  clearProducts: () => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider = ({ children }: { children: ReactNode }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Giriş/kayıt sonrası çağrılır: kullanıcının gerçek rafını backend API'den çeker.
  const loadProducts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await productService.getProducts();
      setProducts(data);
    } catch (error) {
      errorDev('Error loading products:', error);
      setLoadError('Dolabın şu anda yenilenemedi. Bağlantını kontrol edip tekrar deneyebilirsin.');
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      const newProduct = await productService.addProduct(productData);
      setProducts(prev => [newProduct, ...prev]);
    } catch (error) {
      errorDev('Error adding product:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    try {
      const currentProduct = products.find(product => product.id === id);
      if (!currentProduct) {
        throw new Error('Ürün bulunamadı.');
      }

      const savedProduct = await productService.updateProduct(id, { ...currentProduct, ...updates });
      setProducts(prev => prev.map(p => p.id === id ? savedProduct : p));
    } catch (error) {
      errorDev('Error updating product:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await productService.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      errorDev('Error deleting product:', error);
      throw error;
    }
  };

  const clearProducts = () => {
    setProducts([]);
    setLoadError(null);
  };

  return (
    <ProductContext.Provider
      value={{
        products,
        isLoading,
        loadError,
        addProduct,
        updateProduct,
        deleteProduct,
        loadProducts,
        clearProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (!context) throw new Error('useProducts must be used within ProductProvider');
  return context;
};
