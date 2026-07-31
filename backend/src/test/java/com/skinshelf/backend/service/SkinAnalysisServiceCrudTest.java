package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.SkinAnalysisRequest;
import com.skinshelf.backend.dto.SkinAnalysisResponse;
import com.skinshelf.backend.dto.SkinLogResponse;
import com.skinshelf.backend.dto.SkinWeeklySummaryResponse;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.SkinLog;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.repository.ProductRepository;
import com.skinshelf.backend.repository.SkinLogRepository;
import com.skinshelf.backend.repository.UserRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
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
    @Autowired
    private ProductRepository productRepository;
    @Autowired
    private JdbcTemplate jdbcTemplate;
    @Autowired
    private EntityManager entityManager;

    @Test
    void analyzeAndSavePersistsLogWithoutStoringPhotoAndUsesFallbackAnalysis() {
        User user = saveUser("skinlog-analyze@example.com");

        SkinAnalysisResponse response = skinAnalysisService.analyzeAndSave(user, request(
                "Kızarıklık ve hassasiyet var", true, "Yeni bir serum denedim."));

        assertNotNull(response.getLogId());
        assertEquals("unknown", response.getVisibleChanges().get("redness"));
        assertEquals("low", response.getRiskLevel());
        assertFalse(response.getTags().isEmpty());
        assertTrue(response.isFallbackUsed());
        assertFalse(response.getUsedContext().isEmpty());
        assertEquals("unknown", response.getPhotoQuality());
        assertTrue(response.getComparisonSummary().contains("karşılaştırmasına eklenmedi"));

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
        assertEquals(0, summary.getComparableLogCount());
        assertTrue(summary.getShellyComment().contains("henüz cilt kaydın yok"));
    }

    @Test
    void weeklySummaryReflectsExistingLogCount() {
        User user = saveUser("skinlog-summary-filled@example.com");
        skinAnalysisService.analyzeAndSave(user, request("Normal", false, "Haftalık özet için kayıt"));

        SkinWeeklySummaryResponse summary = skinAnalysisService.weeklySummary(user);

        assertEquals(1, summary.getLogCount());
        assertEquals(0, summary.getComparableLogCount());
        assertFalse(summary.getShellyComment().isBlank());
    }

    @Test
    void fallbackAnalysisIsNotPresentedAsPhotoComparison() {
        User user = saveUser("skinlog-compare@example.com");
        skinAnalysisService.analyzeAndSave(user, request("Kızarıklık var", false, "İlk kayıt"));

        SkinAnalysisResponse second = skinAnalysisService.analyzeAndSave(
                user, request("Kızarıklık ve hassasiyet var", false, "İkinci kayıt"));

        assertEquals("unknown", second.getComparedToPrevious().get("redness"));
        assertTrue(second.getComparisonSummary().contains("karşılaştırmasına eklenmedi"));
        assertTrue(second.getUsedContext().contains("Önceki cilt kaydıyla karşılaştırma"));
    }

    @Test
    void weeklySummaryComparesTwoSevenDayWindowsAndKeepsAcidFrequencyWhenSafetySignalsImprove() {
        User user = saveUser("skinlog-weekly-improves@example.com");
        saveOldActiveAcidProduct(user, "BHA Serum", "Salicylic Acid");
        saveComparableLog(user, 10, "low", "medium", "low", "high", "medium", "good", false);
        saveComparableLog(user, 2, "low", "low", "low", "medium", "low", "good", false);

        SkinWeeklySummaryResponse summary = skinAnalysisService.weeklySummary(user);

        assertEquals(1, summary.getLogCount());
        assertEquals(1, summary.getComparableLogCount());
        assertEquals(1, summary.getPreviousWeekComparableLogCount());
        assertEquals("decreased", summary.getTrends().get("redness"));
        assertEquals("decreased", summary.getTrends().get("blemish"));
        assertEquals("decreased", summary.getTrends().get("irritation"));
        assertEquals("continue", summary.getGuidanceStatus());
        assertTrue(summary.getActiveGuidance().contains("artırmadan sürdürebilirsin"));
        assertTrue(summary.getMonitoredActives().stream().anyMatch(name -> name.contains("BHA Serum")));
        assertTrue(summary.getShellyComment().contains("önceki haftaya göre azalma"));
    }

    @Test
    void weeklySummaryPausesAcidsWhenLatestComparablePhotoHasHighRedness() {
        User user = saveUser("skinlog-weekly-redness@example.com");
        saveOldActiveAcidProduct(user, "AHA Tonik", "Glycolic Acid");
        saveComparableLog(user, 10, "low", "low", "low", "medium", "low", "good", false);
        saveComparableLog(user, 2, "low", "high", "low", "medium", "medium", "good", false);

        SkinWeeklySummaryResponse summary = skinAnalysisService.weeklySummary(user);

        assertEquals("increased", summary.getTrends().get("redness"));
        assertEquals("pause", summary.getGuidanceStatus());
        assertTrue(summary.getActiveGuidance().contains("ara ver"));
    }

    @Test
    void poorQualityAndFallbackLogsAreExcludedFromWeeklyPhotoTrends() {
        User user = saveUser("skinlog-weekly-quality@example.com");
        saveComparableLog(user, 10, "low", "low", "low", "medium", "low", "good", false);
        saveComparableLog(user, 2, "low", "high", "low", "high", "high", "poor", false);
        saveComparableLog(user, 1, "low", "high", "low", "high", "high", "good", true);

        SkinWeeklySummaryResponse summary = skinAnalysisService.weeklySummary(user);

        assertEquals(2, summary.getLogCount());
        assertEquals(0, summary.getComparableLogCount());
        assertEquals(1, summary.getPreviousWeekComparableLogCount());
        assertEquals("unknown", summary.getTrends().get("redness"));
        assertTrue(summary.getShellyComment().contains("karşılaştırmaya uygun değildi"));
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

    private void saveOldActiveAcidProduct(User user, String name, String ingredient) {
        Product product = new Product();
        product.setUser(user);
        product.setName(name);
        product.setBrand("Test Brand");
        product.setCategory("Serum");
        product.setTimeOfDay("evening");
        product.setDescription("Aktif içerik testi");
        product.setActiveIngredients(List.of(ingredient));
        product.setIsActive(true);
        Product saved = productRepository.saveAndFlush(product);
        jdbcTemplate.update(
                "update user_products set created_at = ? where id = ?",
                Timestamp.valueOf(LocalDateTime.now().minusDays(30)),
                saved.getId());
        entityManager.clear();
    }

    private void saveComparableLog(
            User user,
            int daysAgo,
            String dryness,
            String redness,
            String oiliness,
            String blemish,
            String irritation,
            String photoQuality,
            boolean fallbackUsed) {
        SkinLog skinLog = new SkinLog();
        skinLog.setUser(user);
        skinLog.setSkinFeeling("Test kaydı");
        skinLog.setUsedNewProduct(false);
        skinLog.setDrynessLevel(dryness);
        skinLog.setRednessLevel(redness);
        skinLog.setOilinessLevel(oiliness);
        skinLog.setBlemishLevel(blemish);
        skinLog.setIrritationLevel(irritation);
        skinLog.setAnalysisJson("{\"fallbackUsed\":" + fallbackUsed
                + ",\"photoQuality\":\"" + photoQuality + "\"}");
        SkinLog saved = skinLogRepository.saveAndFlush(skinLog);
        jdbcTemplate.update(
                "update skin_logs set created_at = ? where id = ?",
                Timestamp.valueOf(LocalDateTime.now().minusDays(daysAgo)),
                saved.getId());
        entityManager.clear();
    }
}
