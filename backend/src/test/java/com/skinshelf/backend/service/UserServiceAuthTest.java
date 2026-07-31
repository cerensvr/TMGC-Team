package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.AuthResponse;
import com.skinshelf.backend.dto.ChangePasswordRequest;
import com.skinshelf.backend.dto.LoginRequest;
import com.skinshelf.backend.dto.ProductRequest;
import com.skinshelf.backend.dto.RegisterRequest;
import com.skinshelf.backend.dto.SkinAnalysisRequest;
import com.skinshelf.backend.dto.UpdateAccountRequest;
import com.skinshelf.backend.dto.UserResponse;
import com.skinshelf.backend.dto.UserProfileRequest;
import com.skinshelf.backend.entity.AssistantMessage;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.AssistantMessageRepository;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserProfileRepository;
import com.skinshelf.backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Issue #17 kapsamı: "Auth register/login ve hatalı yetkilendirme" +
 * "Account deletion cascade". Gerçek H2 test veritabanına karşı çalışır,
 * production DB veya Gemini'ye bağlanmaz.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserServiceAuthTest {

    @Autowired
    private UserService userService;
    @Autowired
    private ProductService productService;
    @Autowired
    private UserProfileService userProfileService;
    @Autowired
    private SkinAnalysisService skinAnalysisService;
    @Autowired
    private AssistantMessageRepository assistantMessageRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private UserProfileRepository userProfileRepository;
    @Autowired
    private SkinLogRepository skinLogRepository;

    @Test
    void registersNewUserWithHashedPasswordAndReturnsToken() {
        AuthResponse response = userService.register(registerRequest("auth-new@example.com", "SecurePass1"));

        assertNotNull(response.getToken());
        assertFalse(response.getToken().isBlank());
        assertEquals("auth-new@example.com", response.getUser().getEmail());

        User saved = userRepository.findByEmail("auth-new@example.com").orElseThrow();
        assertTrue(saved.getPassword().startsWith("$2"), "Şifre bcrypt ile hashlenmiş olmalı");
    }

    @Test
    void rejectsRegistrationWithAlreadyUsedEmail() {
        userService.register(registerRequest("auth-dup@example.com", "SecurePass1"));

        assertThrows(RuntimeException.class,
                () -> userService.register(registerRequest("auth-dup@example.com", "AnotherPass1")));
    }

    @Test
    void loginSucceedsWithCorrectCredentials() {
        userService.register(registerRequest("auth-login@example.com", "SecurePass1"));

        AuthResponse response = userService.login(loginRequest("auth-login@example.com", "SecurePass1"));

        assertNotNull(response.getToken());
        assertEquals("auth-login@example.com", response.getUser().getEmail());
    }

    @Test
    void loginFailsWithWrongPassword() {
        userService.register(registerRequest("auth-wrongpass@example.com", "SecurePass1"));

        assertThrows(RuntimeException.class,
                () -> userService.login(loginRequest("auth-wrongpass@example.com", "IncorrectPass1")));
    }

    @Test
    void loginFailsWithUnknownEmail() {
        assertThrows(RuntimeException.class,
                () -> userService.login(loginRequest("auth-ghost@example.com", "SecurePass1")));
    }

    @Test
    void updatesAuthenticatedAccountNames() {
        userService.register(registerRequest("auth-update@example.com", "SecurePass1"));
        User user = userRepository.findByEmail("auth-update@example.com").orElseThrow();
        UpdateAccountRequest request = new UpdateAccountRequest();
        request.setFirstName("  Ceren  ");
        request.setLastName("  Sivri  ");

        UserResponse response = userService.updateAccount(user, request);

        assertEquals("Ceren", response.getFirstName());
        assertEquals("Sivri", response.getLastName());
    }

    @Test
    void changesPasswordOnlyAfterCurrentPasswordVerification() {
        userService.register(registerRequest("auth-password@example.com", "SecurePass1"));
        User user = userRepository.findByEmail("auth-password@example.com").orElseThrow();
        ChangePasswordRequest request = changePasswordRequest("SecurePass1", "NewSecurePass2");

        userService.changePassword(user, request);

        assertThrows(RuntimeException.class,
                () -> userService.login(loginRequest("auth-password@example.com", "SecurePass1")));
        assertNotNull(userService.login(loginRequest("auth-password@example.com", "NewSecurePass2")).getToken());
    }

    @Test
    void rejectsPasswordChangeWithWrongCurrentPassword() {
        userService.register(registerRequest("auth-password-reject@example.com", "SecurePass1"));
        User user = userRepository.findByEmail("auth-password-reject@example.com").orElseThrow();

        assertThrows(RuntimeException.class,
                () -> userService.changePassword(user, changePasswordRequest("WrongPass1", "NewSecurePass2")));
        assertNotNull(userService.login(loginRequest("auth-password-reject@example.com", "SecurePass1")).getToken());
    }

    @Test
    void deleteAccountCascadesProductsProfileSkinLogsAndAssistantMessages() {
        userService.register(registerRequest("auth-delete@example.com", "SecurePass1"));
        User user = userRepository.findByEmail("auth-delete@example.com").orElseThrow();

        productService.addProduct(user, productRequest());
        userProfileService.saveOrUpdateProfile(user, profileRequest());
        skinAnalysisService.analyzeAndSave(user, skinAnalysisRequest());

        AssistantMessage message = new AssistantMessage();
        message.setUser(user);
        message.setPrompt("Bugünkü rutinim ağır mı?");
        message.setIntentType("INFO");
        message.setAiResponse("{\"summary\":\"test\"}");
        assistantMessageRepository.save(message);

        assertEquals(1, productRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).size());
        assertTrue(userProfileRepository.findByUserId(user.getId()).isPresent());
        assertEquals(1, skinLogRepository.findTop30ByUserOrderByCreatedAtDesc(user).size());

        userService.deleteAccount(user);
        productRepository.flush();
        userProfileRepository.flush();
        skinLogRepository.flush();
        assistantMessageRepository.flush();

        assertTrue(productRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).isEmpty());
        assertTrue(userProfileRepository.findByUserId(user.getId()).isEmpty());
        assertTrue(userRepository.findByEmail("auth-delete@example.com").isEmpty());

        assertThrows(RuntimeException.class,
                () -> userService.login(loginRequest("auth-delete@example.com", "SecurePass1")));
    }

    private RegisterRequest registerRequest(String email, String password) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword(password);
        request.setFirstName("Test");
        request.setLastName("User");
        return request;
    }

    private LoginRequest loginRequest(String email, String password) {
        LoginRequest request = new LoginRequest();
        request.setEmail(email);
        request.setPassword(password);
        return request;
    }

    private ChangePasswordRequest changePasswordRequest(String currentPassword, String newPassword) {
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword(currentPassword);
        request.setNewPassword(newPassword);
        return request;
    }

    private ProductRequest productRequest() {
        ProductRequest request = new ProductRequest();
        request.setName("Test Serum");
        request.setBrand("SkinShelf Lab");
        request.setCategory("Serum");
        request.setTimeOfDay("evening");
        request.setImageUrl("https://images.example.com/product.jpg");
        request.setDescription("Test ürün açıklaması.");
        request.setExpiryDate("2027-01");
        request.setActiveIngredients(List.of("Niacinamide"));
        request.setIsFavorite(false);
        request.setIsActive(true);
        return request;
    }

    private UserProfileRequest profileRequest() {
        UserProfileRequest request = new UserProfileRequest();
        request.setDisplayName("Test Kullanıcı");
        request.setSkinType("Karma");
        request.setMainGoal("Nem dengesi");
        return request;
    }

    private SkinAnalysisRequest skinAnalysisRequest() {
        SkinAnalysisRequest request = new SkinAnalysisRequest();
        request.setSkinFeeling("Normal");
        request.setUsedNewProduct(false);
        request.setUserNote("Test günlüğü kaydı.");
        return request;
    }
}
