package com.skinshelf.backend.dto;

/** Shelly yanıtında gerçekten kullanılan, backend tarafından doğrulanmış bağlam. */
public record AssistantContextEvidence(
        String type,
        String label,
        String detail) {
}
