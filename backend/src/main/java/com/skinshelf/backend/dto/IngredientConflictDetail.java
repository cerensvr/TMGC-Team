package com.skinshelf.backend.dto;

/** Yeni ürün ile kullanıcının dolabındaki doğrulanmış içerik çakışması. */
public record IngredientConflictDetail(
        Long productId,
        String productName,
        String trigger,
        String severity,
        String recommendation) {
}
