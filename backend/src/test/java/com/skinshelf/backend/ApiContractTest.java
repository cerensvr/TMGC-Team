package com.skinshelf.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Set;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
class ApiContractTest {

    private static final Set<String> CRITICAL_CONTRACT = Set.of(
            "GET /api/health",
            "POST /api/auth/register",
            "POST /api/auth/login",
            "GET /api/auth/me",
            "PATCH /api/auth/me",
            "POST /api/auth/change-password",
            "DELETE /api/auth/me",
            "GET /api/profiles/me",
            "PUT /api/profiles/me",
            "POST /api/profiles/save",
            "GET /api/products",
            "POST /api/products",
            "GET /api/products/{productId}",
            "PUT /api/products/{productId}",
            "DELETE /api/products/{productId}",
            "POST /api/products/recognize",
            "POST /api/assistant/chat",
            "GET /api/assistant/history",
            "DELETE /api/assistant/history",
            "POST /api/assistant/analyze-ingredients",
            "POST /api/skin-logs/analyze",
            "GET /api/skin-logs",
            "GET /api/skin-logs/summary/weekly",
            "DELETE /api/skin-logs/{logId}");

    @Autowired
    private RequestMappingHandlerMapping handlerMapping;

    @Test
    void criticalMobileApiContractDoesNotDrift() {
        Set<String> actual = handlerMapping.getHandlerMethods().entrySet().stream()
                .filter(entry -> entry.getValue().getBeanType().getPackageName()
                        .startsWith("com.skinshelf.backend.controller"))
                .flatMap(entry -> entry.getKey().getPatternValues().stream()
                        .flatMap(path -> entry.getKey().getMethodsCondition().getMethods().stream()
                                .map(method -> method.asHttpMethod().name() + " " + path)))
                .collect(Collectors.toSet());

        Set<String> missing = CRITICAL_CONTRACT.stream()
                .filter(endpoint -> !actual.contains(endpoint))
                .collect(Collectors.toSet());
        assertEquals(Set.of(), missing, "Mobil istemcinin kullandığı kritik endpoint sözleşmesi değişti");
    }
}
