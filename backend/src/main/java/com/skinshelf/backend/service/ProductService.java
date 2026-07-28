package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.dto.ProductRequest;
import com.skinshelf.backend.dto.ProductResponse;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.exception.ResourceNotFoundException;
import com.skinshelf.backend.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final GeminiApiClient geminiApiClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ProductService(ProductRepository productRepository, GeminiApiClient geminiApiClient) {
        this.productRepository = productRepository;
        this.geminiApiClient = geminiApiClient;
    }

    public List<ProductResponse> getProducts(User user) {
        return productRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(ProductResponse::from)
                .toList();
    }

    public ProductResponse getProduct(User user, Long productId) {
        return ProductResponse.from(findOwnedProduct(user, productId));
    }

    public ProductResponse addProduct(User user, ProductRequest request) {
        Product product = new Product();
        product.setUser(user);
        applyRequest(product, request);

        enrichProductWithAi(product);

        return ProductResponse.from(productRepository.save(product));
    }

    public ProductResponse updateProduct(User user, Long productId, ProductRequest request) {
        Product product = findOwnedProduct(user, productId);
        applyRequest(product, request);

        enrichProductWithAi(product);

        return ProductResponse.from(productRepository.save(product));
    }

    public void deleteProduct(User user, Long productId) {
        Product product = findOwnedProduct(user, productId);
        productRepository.delete(product);
    }

    private Product findOwnedProduct(User user, Long productId) {
        return productRepository.findByIdAndUserId(productId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Ürün bulunamadı."));
    }

    private void applyRequest(Product product, ProductRequest request) {
        product.setIsActive(request.getIsActive() == null || request.getIsActive());
        product.setName(request.getName().trim());
        product.setBrand(request.getBrand().trim());
        product.setCategory(request.getCategory().trim());

        product.setTimeOfDay(request.getTimeOfDay() == null || request.getTimeOfDay().isBlank() ? "both"
                : request.getTimeOfDay().trim());

        product.setImageUrl(blankToNull(request.getImageUrl()));
        product.setCutoutImageUrl(blankToNull(request.getCutoutImageUrl()));
        product.setDescription(blankToNull(request.getDescription()));
        product.setExpiryDate(blankToNull(request.getExpiryDate()));
        product.setActiveIngredients(
                request.getActiveIngredients() == null ? List.of() : request.getActiveIngredients());
        product.setFavorite(Boolean.TRUE.equals(request.getIsFavorite()));
    }

    private void enrichProductWithAi(Product product) {
        if (!geminiApiClient.isConfigured()) {
            return;
        }

        String desc = product.getDescription();
        boolean hasNoIngredients = product.getActiveIngredients() == null || product.getActiveIngredients().isEmpty();
        boolean isDescMissing = desc == null || desc.isBlank() || desc.contains("eksik") || desc.contains("bulunamadı");

        if (!hasNoIngredients && !isDescMissing && !"Diğer".equalsIgnoreCase(product.getCategory())) {
            return;
        }

        String prompt = """
                Sen akilli bir kozmetik urun veritabani asistanisin.
                Sana gelen su urunun marka ve adini kullanarak, onun gercek kategorisini, iceriklerini, aciklamasini ve en guvenli kullanim zamanini bul:
                - Marka: %s
                - Ad: %s

                Cevabi YALNIZCA su JSON formatinda don (doğrudan { ile basla ve } ile bitir):
                {
                  "category": "Temizleyici|Tonik|Serum|Nemlendirici|Gunes Kremi|Maske|Diger",
                  "activeIngredients": ["Niacinamide", "Salicylic Acid" vb. hammadde adlari],
                  "description": "Turkce kisa aciklama cumlesi",
                  "timeOfDay": "morning|evening|both"
                }
                """
                .formatted(product.getBrand(), product.getName());

        try {
            log.info("Eksik ürün bilgisi tespit edildi. Gemini ile ürün zenginleştiriliyor: {} {}", product.getBrand(),
                    product.getName());
            var result = geminiApiClient.generateJsonWithStatus(prompt, null, null);

            if (result.json().isPresent()) {
                JsonNode json = result.json().get();

                // 1. Kategori düzeltme (Dinamik AI kararı)
                if (product.getCategory() == null || product.getCategory().isBlank()
                        || "Diğer".equalsIgnoreCase(product.getCategory())) {
                    String aiCategory = json.path("category").asText("Diğer").trim();
                    product.setCategory(aiCategory);
                }

                if (isDescMissing) {
                    String aiDesc = json.path("description").asText("Cilt bakımı ürünü.").trim();
                    product.setDescription(aiDesc);
                }

                if (hasNoIngredients) {
                    List<String> ingredients = new ArrayList<>();
                    json.path("activeIngredients").forEach(node -> {
                        String ing = node.asText("").trim();
                        if (!ing.isBlank()) {
                            ingredients.add(ing);
                        }
                    });
                    product.setActiveIngredients(ingredients);
                }

                if (product.getTimeOfDay() == null || product.getTimeOfDay().isBlank()
                        || "both".equalsIgnoreCase(product.getTimeOfDay())) {
                    String aiTime = json.path("timeOfDay").asText("both").trim();
                    product.setTimeOfDay(aiTime);
                }

                log.info("Ürün başarıyla AI tarafından zenginleştirildi: {}", product.getName());
            }
        } catch (Exception e) {
            log.error("AI Ürün Zenginleştirme Hatası", e);
        }
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
