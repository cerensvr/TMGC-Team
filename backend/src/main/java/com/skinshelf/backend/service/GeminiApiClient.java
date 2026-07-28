package com.skinshelf.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Optional;

@Service
public class GeminiApiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiApiClient.class);

    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GeminiApiClient(
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.model:gemini-3.6-flash}") String model) {

        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = (model == null || model.isBlank())
                ? "gemini-3.6-flash"
                : model.trim();
        if (this.model.startsWith("gemini-2.0")) {
            throw new IllegalStateException(
                    "Gemini 2.0 modelleri kapatıldı; GEMINI_MODEL için güncel bir model kullanın.");
        }

        this.objectMapper = new ObjectMapper();

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public enum FailureReason {
        NONE,
        RATE_LIMITED,
        ERROR
    }

    public record GeminiJsonResult(Optional<JsonNode> json, FailureReason reason) {
        public boolean isRateLimited() {
            return reason == FailureReason.RATE_LIMITED;
        }
    }

    public boolean isConfigured() {
        return !apiKey.isBlank();
    }

    public Optional<JsonNode> generateJson(String prompt) {
        return generateJsonWithStatus(prompt, null, null).json();
    }

    public Optional<JsonNode> generateJson(String prompt,
            String base64Image,
            String imageMimeType) {
        return generateJsonWithStatus(prompt, base64Image, imageMimeType).json();
    }

    public GeminiJsonResult generateJsonWithStatus(String prompt,
            String base64Image,
            String imageMimeType) {

        return generateJsonWithStatus(prompt, base64Image, imageMimeType, true);
    }

    private GeminiJsonResult generateJsonWithStatus(String prompt,
            String base64Image,
            String imageMimeType,
            boolean retryOnJsonParseError) {

        if (!isConfigured()) {
            log.error("Gemini API Key bulunamadı.");
            return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
        }

        try {

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(buildUri())
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            buildRequest(prompt, base64Image, imageMimeType)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Gemini Status : {}", response.statusCode());

            if (response.statusCode() == 429) {
                log.warn("Gemini kota sınırına ulaşıldı.");
                return new GeminiJsonResult(Optional.empty(), FailureReason.RATE_LIMITED);
            }

            if (response.statusCode() != 200) {
                log.error("Gemini Hata Body:\n{}", response.body());
                return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
            }

            JsonNode root = objectMapper.readTree(response.body());

            String text = root.path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText("");

            if (text.isBlank()) {
                log.error("Gemini boş cevap döndürdü.");
                return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
            }

            JsonNode json;
            try {
                json = objectMapper.readTree(stripMarkdownFence(text));
            } catch (JsonProcessingException e) {
                if (retryOnJsonParseError) {
                    log.info("Gemini JSON parse edilemedi, kisa JSON icin tekrar deneniyor.");
                    return generateJsonWithStatus(
                            buildRetryPrompt(prompt),
                            base64Image,
                            imageMimeType,
                            false);
                }
                log.warn("Gemini JSON parse edilemedi: {}", e.getOriginalMessage());
                return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
            }

            return new GeminiJsonResult(Optional.of(json), FailureReason.NONE);

        } catch (Exception e) {
            log.error("Gemini Exception", e);
            return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
        }
    }

    private URI buildUri() {

        String encodedModel = URLEncoder.encode(model, StandardCharsets.UTF_8);

        String encodedKey = URLEncoder.encode(apiKey, StandardCharsets.UTF_8);

        return URI.create(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                        + encodedModel
                        + ":generateContent?key="
                        + encodedKey);

    }

    private String buildRequest(String prompt,
            String base64Image,
            String imageMimeType) throws Exception {

        ObjectNode root = objectMapper.createObjectNode();

        ArrayNode contents = root.putArray("contents");

        ObjectNode content = contents.addObject();
        content.put("role", "user");

        ArrayNode parts = content.putArray("parts");

        if (base64Image != null && !base64Image.isBlank()) {

            ObjectNode inlineData = parts.addObject().putObject("inline_data");

            inlineData.put(
                    "mime_type",
                    imageMimeType == null || imageMimeType.isBlank()
                            ? "image/jpeg"
                            : imageMimeType);

            inlineData.put("data", base64Image);
        }

        parts.addObject().put("text", prompt);

        ObjectNode generationConfig = root.putObject("generationConfig");

        generationConfig.put("candidateCount", 1);
        generationConfig.put("maxOutputTokens", 4096);
        generationConfig.put("responseMimeType", "application/json");

        return objectMapper.writeValueAsString(root);
    }

    private String stripMarkdownFence(String value) {

        String trimmed = value.trim();

        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        return trimmed
                .replaceFirst("^```(?:json)?\\s*", "")
                .replaceFirst("\\s*```$", "")
                .trim();
    }

    private String buildRetryPrompt(String prompt) {
        return prompt
                + "\n\nCevabi yalnizca kisa, tamamlanmis ve gecerli JSON olarak dondur. "
                + "Ek aciklama, markdown veya yarim kalan alan yazma.";
    }
}
