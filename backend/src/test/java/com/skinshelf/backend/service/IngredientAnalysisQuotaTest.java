package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.IngredientAnalysisRequest;
import com.skinshelf.backend.dto.IngredientAnalysisResponse;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class IngredientAnalysisQuotaTest {

    @Mock
    private GeminiApiClient geminiApiClient;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserProfileRepository userProfileRepository;

    @Test
    void knownIngredientsUseLocalKnowledgeWithoutSpendingGeminiRequest() {
        IngredientAnalysisService service = new IngredientAnalysisService(
                geminiApiClient,
                productRepository,
                userProfileRepository,
                new IngredientKnowledgeBase());

        User user = new User();
        user.setId(12L);
        when(userProfileRepository.findByUserId(12L)).thenReturn(Optional.empty());
        when(productRepository.findByUserIdOrderByCreatedAtDesc(12L)).thenReturn(List.of());

        IngredientAnalysisRequest request = new IngredientAnalysisRequest();
        request.setName("BHA Serum");
        request.setCategory("Serum");
        request.setActiveIngredients(List.of("Salicylic Acid", "Niacinamide"));

        IngredientAnalysisResponse response = service.analyze(user, request);

        assertEquals("evening", response.getSuggestedTimeOfDay());
        assertTrue(response.getNotableIngredients().contains("Salicylic Acid"));
        verifyNoInteractions(geminiApiClient);
    }

    @Test
    void localAnalysisReturnsExactShelfConflictAndSaferSchedule() {
        IngredientAnalysisService service = new IngredientAnalysisService(
                geminiApiClient,
                productRepository,
                userProfileRepository,
                new IngredientKnowledgeBase());

        User user = new User();
        user.setId(13L);
        Product retinol = new Product();
        retinol.setId(88L);
        retinol.setBrand("SkinShelf");
        retinol.setName("Retinol Serum");
        retinol.setCategory("Serum");
        retinol.setTimeOfDay("evening");
        retinol.setActiveIngredients(List.of("Retinol"));

        when(userProfileRepository.findByUserId(13L)).thenReturn(Optional.empty());
        when(productRepository.findByUserIdOrderByCreatedAtDesc(13L)).thenReturn(List.of(retinol));

        IngredientAnalysisRequest request = new IngredientAnalysisRequest();
        request.setName("BHA Tonik");
        request.setCategory("Tonik");
        request.setActiveIngredients(List.of("Salicylic Acid"));

        IngredientAnalysisResponse response = service.analyze(user, request);

        assertEquals(1, response.getConflicts().size());
        assertEquals(88L, response.getConflicts().get(0).productId());
        assertEquals("Retinoid + AHA/BHA", response.getConflicts().get(0).trigger());
        assertTrue(response.getConflicts().get(0).recommendation().contains("farklı gecelere"));
        verifyNoInteractions(geminiApiClient);
    }
}
