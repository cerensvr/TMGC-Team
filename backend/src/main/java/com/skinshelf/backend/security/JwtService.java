package com.skinshelf.backend.security;

import com.skinshelf.backend.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class JwtService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final Pattern SUBJECT_PATTERN = Pattern.compile("\"sub\"\\s*:\\s*(\\d+)");
    private static final Pattern EXPIRATION_PATTERN = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");
    private static final long MIN_EXPIRATION_SECONDS = 300;
    private static final long MAX_EXPIRATION_SECONDS = 31_536_000;

    private final String secret;
    private final long expirationSeconds;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-seconds:604800}") long expirationSeconds) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("app.jwt.secret en az 32 karakter olmalıdır.");
        }
        String normalizedSecret = secret.trim().toUpperCase();
        if (normalizedSecret.contains("CHANGE_ME") || normalizedSecret.contains("REPLACE_WITH")) {
            throw new IllegalStateException("app.jwt.secret örnek değer olamaz; güçlü ve rastgele bir secret kullanın.");
        }
        if (expirationSeconds < MIN_EXPIRATION_SECONDS || expirationSeconds > MAX_EXPIRATION_SECONDS) {
            throw new IllegalStateException(
                    "app.jwt.expiration-seconds 300 ile 31536000 arasında olmalıdır.");
        }
        this.secret = secret;
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(User user) {
        try {
            String encodedHeader = encodeJson("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
            String encodedPayload = encodeJson("""
                    {"sub":%d,"email":"%s","exp":%d}
                    """.formatted(
                    user.getId(),
                    escapeJson(user.getEmail()),
                    Instant.now().getEpochSecond() + expirationSeconds));
            String unsignedToken = encodedHeader + "." + encodedPayload;

            return unsignedToken + "." + sign(unsignedToken);
        } catch (Exception e) {
            throw new IllegalStateException("Token üretilemedi.", e);
        }
    }

    public Long extractUserId(String token) {
        String payload = parseAndValidate(token);
        return extractLongClaim(payload, SUBJECT_PATTERN, "sub");
    }

    private String parseAndValidate(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                throw new IllegalArgumentException("Token formatı geçersiz.");
            }

            String unsignedToken = parts[0] + "." + parts[1];
            if (!constantTimeEquals(sign(unsignedToken), parts[2])) {
                throw new IllegalArgumentException("Token imzası geçersiz.");
            }

            String payload = new String(BASE64_URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);
            long expirationEpoch = extractLongClaim(payload, EXPIRATION_PATTERN, "exp");

            if (Instant.now().getEpochSecond() >= expirationEpoch) {
                throw new IllegalArgumentException("Token süresi dolmuş.");
            }

            return payload;
        } catch (Exception e) {
            throw new IllegalArgumentException("Token doğrulanamadı.", e);
        }
    }

    private String encodeJson(String value) {
        return BASE64_URL_ENCODER.encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private long extractLongClaim(String payload, Pattern pattern, String claimName) {
        Matcher matcher = pattern.matcher(payload);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Token claim eksik: " + claimName);
        }
        return Long.parseLong(matcher.group(1));
    }

    private String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String sign(String unsignedToken) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
        return BASE64_URL_ENCODER.encodeToString(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
    }

    private boolean constantTimeEquals(String first, String second) {
        byte[] firstBytes = first.getBytes(StandardCharsets.UTF_8);
        byte[] secondBytes = second.getBytes(StandardCharsets.UTF_8);
        if (firstBytes.length != secondBytes.length) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < firstBytes.length; i++) {
            result |= firstBytes[i] ^ secondBytes[i];
        }
        return result == 0;
    }
}
