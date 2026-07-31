package com.skinshelf.backend.dto;

/** Shelly yanıtını uygulanabilir bir rutin sırasına dönüştüren doğrulanmış adım. */
public record AssistantRoutineStep(
        String period,
        int order,
        Long productId,
        String productName,
        String status,
        String instruction) {
}
