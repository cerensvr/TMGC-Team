package com.skinshelf.backend.dto;

/** Kullanıcının dolabındaki bir ürünün yanıttaki rolü. */
public record AssistantProductInsight(
        Long productId,
        String brand,
        String productName,
        String category,
        String status,
        String timeOfDay,
        String reason) {
}
