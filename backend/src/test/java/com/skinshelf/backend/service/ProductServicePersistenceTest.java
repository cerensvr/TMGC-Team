package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.ProductRequest;
import com.skinshelf.backend.dto.ProductResponse;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.exception.ResourceNotFoundException;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ProductServicePersistenceTest {

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void persistsCompleteCrudFavoriteAndRoutineState() {
        User user = saveUser("product-owner@example.com");

        ProductResponse created = productService.addProduct(user, request(
                "Cicaplast Baume B5+",
                "La Roche-Posay",
                "Nemlendirici",
                "both",
                false,
                true));

        assertEquals("Cicaplast Baume B5+", created.getName());
        assertFalse(created.getIsFavorite());
        assertTrue(created.getIsActive());
        assertEquals(List.of("Panthenol", "Madecassoside"), created.getActiveIngredients());

        ProductResponse detail = productService.getProduct(user, Long.valueOf(created.getId()));
        assertEquals(created.getId(), detail.getId());
        assertEquals(1, productService.getProducts(user).size());

        ProductResponse updated = productService.updateProduct(
                user,
                Long.valueOf(created.getId()),
                request(
                        "Cicaplast Baume B5+ Onarıcı",
                        "La Roche-Posay",
                        "Nemlendirici",
                        "evening",
                        true,
                        false));

        assertEquals("Cicaplast Baume B5+ Onarıcı", updated.getName());
        assertEquals("evening", updated.getTimeOfDay());
        assertTrue(updated.getIsFavorite());
        assertFalse(updated.getIsActive());

        ProductResponse reloaded = productService.getProduct(user, Long.valueOf(created.getId()));
        assertTrue(reloaded.getIsFavorite());
        assertFalse(reloaded.getIsActive());

        productService.deleteProduct(user, Long.valueOf(created.getId()));
        productRepository.flush();

        assertTrue(productService.getProducts(user).isEmpty());
        assertThrows(
                ResourceNotFoundException.class,
                () -> productService.getProduct(user, Long.valueOf(created.getId())));
    }

    @Test
    void preventsReadingUpdatingOrDeletingAnotherUsersProduct() {
        User owner = saveUser("product-owner-2@example.com");
        User otherUser = saveUser("different-user@example.com");
        ProductResponse created = productService.addProduct(
                owner,
                request("BHA Serum", "SkinShelf Lab", "Serum", "evening", false, true));
        Long productId = Long.valueOf(created.getId());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProduct(otherUser, productId));
        assertThrows(
                ResourceNotFoundException.class,
                () -> productService.updateProduct(
                        otherUser,
                        productId,
                        request("Changed", "Other", "Serum", "both", true, false)));
        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(otherUser, productId));
    }

    private User saveUser(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("test-password");
        user.setFirstName("Test");
        user.setLastName("User");
        return userRepository.save(user);
    }

    private ProductRequest request(
            String name,
            String brand,
            String category,
            String timeOfDay,
            boolean favorite,
            boolean active) {
        ProductRequest request = new ProductRequest();
        request.setName(name);
        request.setBrand(brand);
        request.setCategory(category);
        request.setTimeOfDay(timeOfDay);
        request.setImageUrl("https://images.example.com/product.jpg");
        request.setDescription("Test ürün açıklaması.");
        request.setExpiryDate("2027-01");
        request.setActiveIngredients(List.of("Panthenol", "Madecassoside"));
        request.setIsFavorite(favorite);
        request.setIsActive(active);
        return request;
    }
}
