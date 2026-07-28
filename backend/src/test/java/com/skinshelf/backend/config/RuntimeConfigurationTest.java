package com.skinshelf.backend.config;

import com.skinshelf.backend.security.JwtService;
import com.skinshelf.backend.service.GeminiApiClient;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RuntimeConfigurationTest {

    private static final String STRONG_SECRET = "test-only-random-jwt-secret-1234567890";

    @Test
    void acceptsSafeRuntimeConfiguration() {
        assertDoesNotThrow(() -> new JwtService(STRONG_SECRET, 604800));
        assertDoesNotThrow(() -> new WebConfig("https://app.example.com"));
        assertDoesNotThrow(() -> new GeminiApiClient("test-key", "gemini-3.6-flash"));
    }

    @Test
    void rejectsPlaceholderAndInvalidJwtSettings() {
        assertThrows(IllegalStateException.class,
                () -> new JwtService("REPLACE_WITH_AT_LEAST_32_RANDOM_CHARACTERS", 604800));
        assertThrows(IllegalStateException.class,
                () -> new JwtService("too-short", 604800));
        assertThrows(IllegalStateException.class,
                () -> new JwtService(STRONG_SECRET, 60));
    }

    @Test
    void rejectsWildcardCorsAndShutdownGeminiModel() {
        assertThrows(IllegalStateException.class, () -> new WebConfig("*"));
        assertThrows(IllegalStateException.class, () -> new WebConfig(" , "));
        assertThrows(IllegalStateException.class,
                () -> new GeminiApiClient("test-key", "gemini-2.0-flash"));
    }
}
