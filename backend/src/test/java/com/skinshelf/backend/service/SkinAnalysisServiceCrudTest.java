package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.SkinAnalysisRequest;
import com.skinshelf.backend.dto.SkinAnalysisResponse;
import com.skinshelf.backend.dto.SkinLogResponse;
import com.skinshelf.backend.dto.SkinWeeklySummaryResponse;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.SkinLogRepository;
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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Issue #17 kapsamı: "Skin log CRUD ve weekly summary". Test profilinde
 * Gemini API key boş olduğu için tüm analizler otomatik olarak fallback
 * yoluna düşer; bu da testleri production/Gemini bağımlılığından bağımsız kılar.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class SkinAnalysisServiceCrudTest {

    @Autowired
    private SkinAnalysisService skinAnalysisService;
    @Autowired
    private SkinLogRepository skinLogRepository;
    @Autowired
    private UserRepository userRepository;

    @Test
    void analyzeAndSavePersistsLogWithoutStoringPhotoAndUsesFallbackAnalysis() {
        User user = saveUser("skinlog-analyze@example.com");

        SkinAnalysisResponse response = skinAnalysisService.analyzeAndSave(user, request(
                "Kızarıklık ve hassasiyet var", true, "Yeni bir serum denedim."));

        assertNotNull(response.getLogId());
        assertEquals("medium", response.getVisibleChanges().get("redness"));
        assertEquals("low", response.getRiskLevel());
        assertFalse(response.getTags().isEmpty());

        // Gizlilik: fotoğraf hiçbir koşulda saklanmamalı.
        var savedLog = skinLogRepository.findById(response.getLogId()).orElseThrow();
        assertNull(savedLog.getPhotoUrl());
    }

    @Test
    void listLogsReturnsOnlyRequestingUsersLogs() {
        User owner = saveUser("skinlog-owner@example.com");
        User otherUser = saveUser("skinlog-other@example.com");

        skinAnalysisService.analyzeAndSave(owner, request("Normal", false, "Kayıt A"));
        skinAnalysisService.analyzeAndSave(otherUser, request("Normal", false, "Kayıt B"));

        List<SkinLogResponse> ownerLogs = skinAnalysisService.listLogs(owner);

        assertEquals(1, ownerLogs.size());
        assertEquals("Kayıt A", ownerLogs.get(0).getUserNote());
    }

    @Test
    void deleteLogIgnoresOtherUsersLogAndRemovesOwnLogLeavingEmptyState() {
        User owner = saveUser("skinlog-delete-owner@example.com");
        User otherUser = saveUser("skinlog-delete-other@example.com");

        SkinAnalysisResponse created = skinAnalysisService.analyzeAndSave(
                owner, request("Normal", false, "Silinecek kayıt"));

        skinAnalysisService.deleteLog(otherUser, created.getLogId());
        assertEquals(1, skinAnalysisService.listLogs(owner).size(), "Başkasının silme isteği kaydı etkilememeli");

        skinAnalysisService.deleteLog(owner, created.getLogId());
        assertTrue(skinAnalysisService.listLogs(owner).isEmpty(), "Kendi kaydını sildikten sonra liste boş durumda olmalı");
    }

    @Test
    void weeklySummaryReturnsZeroStateMessageWhenNoLogsExist() {
        User user = saveUser("skinlog-summary-empty@example.com");

        SkinWeeklySummaryResponse summary = skinAnalysisService.weeklySummary(user);

        assertEquals(0, summary.getLogCount());
        assertTrue(summary.getShellyComment().contains("henüz cilt kaydın yok"));
    }

    @Test
    void weeklySummaryReflectsExistingLogCount() {
        User user = saveUser("skinlog-summary-filled@example.com");
        skinAnalysisService.analyzeAndSave(user, request("Normal", false, "Haftalık özet için kayıt"));

        SkinWeeklySummaryResponse summary = skinAnalysisService.weeklySummary(user);

        assertEquals(1, summary.getLogCount());
        assertFalse(summary.getShellyComment().isBlank());
    }

    private SkinAnalysisRequest request(String skinFeeling, boolean usedNewProduct, String userNote) {
        SkinAnalysisRequest request = new SkinAnalysisRequest();
        request.setSkinFeeling(skinFeeling);
        request.setUsedNewProduct(usedNewProduct);
        request.setUserNote(userNote);
        return request;
    }

    private User saveUser(String email) {
        User user = new User();
        user.setEmail(email);
        user.setPassword("test-password");
        user.setFirstName("Test");
        user.setLastName("User");
        return userRepository.save(user);
    }
}