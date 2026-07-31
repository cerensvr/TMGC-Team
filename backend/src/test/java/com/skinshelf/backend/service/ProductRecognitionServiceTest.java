package com.skinshelf.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.skinshelf.backend.dto.ProductRecognitionRequest;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductRecognitionServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private GeminiApiClient geminiApiClient;

    @Test
    void returnsExactShelfDataWhenVisionMatchesOwnedProduct() throws Exception {
        User user = new User();
        user.setId(7L);

        Product product = new Product();
        product.setId(42L);
        product.setUser(user);
        product.setBrand("La Roche-Posay");
        product.setName("Mela B3 Serum 30 ml");
        product.setCategory("Serum");
        product.setTimeOfDay("both");
        product.setDescription("DB içindeki doğrulanmış açıklama");
        product.setActiveIngredients(List.of("Melasyl", "%10 Niasinamid"));
        product.setCutoutImageUrl("local:la-roche-posay-mela-b3-serum");

        ProductRecognitionRequest request = new ProductRecognitionRequest();
        request.setImageBase64("base64-image");
        request.setImageMimeType("image/jpeg");

        var json = new ObjectMapper().readTree("""
                {
                  "matchedProductId": 42,
                  "brand": "La Roche-Posay",
                  "name": "Mela B3 Serum",
                  "category": "Serum",
                  "timeOfDay": "both",
                  "description": "model açıklaması",
                  "activeIngredients": [],
                  "confidence": "high"
                }
                """);

        when(productRepository.findByUserIdOrderByCreatedAtDesc(7L)).thenReturn(List.of(product));
        when(geminiApiClient.isConfigured()).thenReturn(true);
        when(geminiApiClient.generateJsonWithStatus(
                anyString(), anyString(), eq("base64-image"), eq("image/jpeg"), any()))
                .thenReturn(new GeminiApiClient.GeminiJsonResult(
                        Optional.of(json), GeminiApiClient.FailureReason.NONE));

        var response = new ProductRecognitionService(productRepository, geminiApiClient).recognize(user, request);

        assertTrue(response.isMatchedFromShelf());
        assertEquals("Mela B3 Serum 30 ml", response.getName());
        assertEquals("DB içindeki doğrulanmış açıklama", response.getDescription());
        assertEquals(List.of("Melasyl", "%10 Niasinamid"), response.getActiveIngredients());
        assertEquals("high", response.getConfidence());
    }
}
