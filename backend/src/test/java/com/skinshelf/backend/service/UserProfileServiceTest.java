package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.UserProfileRequest;
import com.skinshelf.backend.dto.UserProfileResponse;
import com.skinshelf.backend.entity.User;
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

/**
 * Issue #17 kapsamı: "Profil get/update". Gerçek H2 test veritabanına karşı
 * çalışır, production DB veya Gemini'ye bağlanmaz.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class UserProfileServiceTest {

    @Autowired
    private UserProfileService userProfileService;
    @Autowired
    private UserRepository userRepository;

    @Test
    void getProfileCreatesEmptyDefaultProfileWhenNoneExists() {
        User user = saveUser("profile-empty@example.com", "Ayşe", "Yıldız");

        UserProfileResponse profile = userProfileService.getProfile(user);

        assertEquals("Ayşe Yıldız", profile.getDisplayName());
        assertEquals("", profile.getSkinType());
        assertFalse(profile.getIsPregnant());
        assertFalse(profile.getIsOnboarded());
    }

    @Test
    void savesNewProfileApplyingFieldPrecedenceRules() {
        User user = saveUser("profile-new@example.com", "Deniz", "Kaya");

        UserProfileRequest request = new UserProfileRequest();
        request.setDisplayName("Deniz K.");
        request.setNickname("Bu kullanılmamalı");
        request.setExperienceLevel("İleri");
        request.setExperience("Bu kullanılmamalı");
        request.setSensitivityLevel("Yüksek");
        request.setSensitivity("Bu kullanılmamalı");
        request.setSkinType("Karma");
        request.setSkinTypeGuess("Bu kullanılmamalı");
        request.setMainGoal("Leke azaltma");
        request.setIsOnboarded(true);
        request.setIsPregnant(false);

        UserProfileResponse response = userProfileService.saveOrUpdateProfile(user, request);

        assertEquals("Deniz K.", response.getDisplayName());
        assertEquals("İleri", response.getExperienceLevel());
        assertEquals("Yüksek", response.getSensitivityLevel());
        assertEquals("Karma", response.getSkinType());
        assertEquals("Leke azaltma", response.getMainGoal());
        assertTrue(response.getIsOnboarded());
        assertFalse(response.getIsPregnant());
    }

    @Test
    void partialUpdatePreservesPreviouslySetFieldsNotIncludedInRequest() {
        User user = saveUser("profile-partial@example.com", "Elif", "Demir");

        UserProfileRequest initial = new UserProfileRequest();
        initial.setDisplayName("Elif D.");
        initial.setSkinType("Yağlı");
        initial.setMainGoal("Sivilce kontrolü");
        initial.setIsOnboarded(true);
        userProfileService.saveOrUpdateProfile(user, initial);

        UserProfileRequest partial = new UserProfileRequest();
        partial.setReactionHistory("Yeni bir ürüne hafif kızarıklık.");

        UserProfileResponse updated = userProfileService.saveOrUpdateProfile(user, partial);

        assertEquals("Elif D.", updated.getDisplayName());
        assertEquals("Yağlı", updated.getSkinType());
        assertEquals("Sivilce kontrolü", updated.getMainGoal());
        assertTrue(updated.getIsOnboarded());
        assertEquals("Yeni bir ürüne hafif kızarıklık.", updated.getReactionHistory());
    }

    @Test
    void getProfileByUserIdThrowsWhenNoProfileHasBeenCreatedYet() {
        User user = saveUser("profile-missing@example.com", "Can", "Öz");

        assertThrows(RuntimeException.class, () -> userProfileService.getProfileByUserId(user.getId()));
    }

    private User saveUser(String email, String firstName, String lastName) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("test-password");
        user.setFirstName(firstName);
        user.setLastName(lastName);
        return userRepository.save(user);
    }
}