package com.skinshelf.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final String fallbackModel;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private static final int MAX_TRANSIENT_RETRIES = 2;
    private static final long TRANSIENT_RETRY_DELAY_MS = 800;

    @Autowired
    public GeminiApiClient(
            @Value("${app.gemini.api-key:}") String apiKey,
            @Value("${app.gemini.model:gemini-3.6-flash}") String model,
            @Value("${app.gemini.fallback-model:gemini-3.5-flash-lite}") String fallbackModel) {

        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = (model == null || model.isBlank())
                ? "gemini-3.6-flash"
                : model.trim();
        this.fallbackModel = (fallbackModel == null || fallbackModel.isBlank())
                ? ""
                : fallbackModel.trim();
        if (this.model.startsWith("gemini-2.0")) {
            throw new IllegalStateException(
                    "Gemini 2.0 modelleri kapatıldı; GEMINI_MODEL için güncel bir model kullanın.");
        }
        if (this.fallbackModel.startsWith("gemini-2.0")) {
            throw new IllegalStateException(
                    "Gemini 2.0 modelleri kapatıldı; GEMINI_FALLBACK_MODEL için güncel bir model kullanın.");
        }

        this.objectMapper = new ObjectMapper();

        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /** Birim testleri ve bağımsız kullanım için geriye uyumlu kurucu. */
    public GeminiApiClient(String apiKey, String model) {
        this(apiKey, model, "gemini-3.5-flash-lite");
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
        return generateJsonWithStatus(prompt, null, null, null).json();
    }

    public Optional<JsonNode> generateJson(String prompt,
            String base64Image,
            String imageMimeType) {
        return generateJsonWithStatus(prompt, base64Image, imageMimeType, null).json();
    }

    public GeminiJsonResult generateJsonWithStatus(String prompt,
            String base64Image,
            String imageMimeType) {

        return generateJsonWithStatus(prompt, base64Image, imageMimeType, null);
    }

    /**
     * responseSchema verilirse, Gemini'ye "JSON dondur" diye prompt metniyle rica
     * etmek yerine, alanlari/tiplerini/enum degerlerini API seviyesinde zorunlu
     * kilariz. responseSchema null ise eski davranis (yalniz prompt'a guveniyor) aynen surer.
     */
    public GeminiJsonResult generateJsonWithStatus(String prompt,
            String base64Image,
            String imageMimeType,
            JsonNode responseSchema) {

        // API seviyesinde şema varsa modelin geçerli JSON üretmesi beklenir. Böyle
        // bir yanıtta ikinci çağrı yapmak ücretsiz kotayı gereksiz tüketir.
        return generateJsonWithStatus(
                null,
                prompt,
                base64Image,
                imageMimeType,
                responseSchema,
                responseSchema == null,
                model,
                true,
                MAX_TRANSIENT_RETRIES);
    }

    /**
     * Kimlik ve değişmez güvenlik kurallarını Gemini'nin özel systemInstruction
     * alanında taşır. Kullanıcı bağlamından ayrı tutulması, kullanıcı metninin bu
     * kuralları ezmesini zorlaştırır.
     */
    public GeminiJsonResult generateJsonWithStatus(String systemInstruction,
            String prompt,
            String base64Image,
            String imageMimeType,
            JsonNode responseSchema) {

        return generateJsonWithStatus(
                systemInstruction,
                prompt,
                base64Image,
                imageMimeType,
                responseSchema,
                responseSchema == null,
                model,
                true,
                MAX_TRANSIENT_RETRIES);
    }

    private GeminiJsonResult generateJsonWithStatus(String systemInstruction,
            String prompt,
            String base64Image,
            String imageMimeType,
            JsonNode responseSchema,
            boolean retryOnJsonParseError,
            String requestedModel,
            boolean allowModelFallback,
            int transientRetriesRemaining) {

        if (!isConfigured()) {
            log.error("Gemini API Key bulunamadı.");
            return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
        }

        try {

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(buildUri(requestedModel))
                    .timeout(Duration.ofSeconds(60))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            buildRequest(systemInstruction, prompt, base64Image, imageMimeType, responseSchema)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            log.info("Gemini Status : {}", response.statusCode());

            boolean modelUnavailable = response.statusCode() == 400
                    || response.statusCode() == 403
                    || response.statusCode() == 404;
            if ((response.statusCode() == 429 || modelUnavailable)
                    && allowModelFallback
                    && !fallbackModel.isBlank()
                    && !fallbackModel.equals(requestedModel)) {
                log.warn("Gemini {} kullanılamadı (durum {}); yedek model {} deneniyor.",
                        requestedModel, response.statusCode(), fallbackModel);
                return generateJsonWithStatus(
                        systemInstruction,
                        prompt,
                        base64Image,
                        imageMimeType,
                        responseSchema,
                        retryOnJsonParseError,
                        fallbackModel,
                        false,
                        MAX_TRANSIENT_RETRIES);
            }

            if (response.statusCode() == 429) {
                log.warn("Gemini kota sınırına ulaşıldı.");
                return new GeminiJsonResult(Optional.empty(), FailureReason.RATE_LIMITED);
            }

            if (response.statusCode() != 200) {
                boolean transientCapacityError = response.statusCode() == 500 || response.statusCode() == 503;
                if (transientCapacityError && transientRetriesRemaining > 0) {
                    log.warn("Gemini gecici kapasite hatasi (durum {}); {} deneme hakki kaldi, kisa bekleyip tekrar denenecek.",
                            response.statusCode(), transientRetriesRemaining);
                    sleepBeforeRetry();
                    return generateJsonWithStatus(
                            systemInstruction,
                            prompt,
                            base64Image,
                            imageMimeType,
                            responseSchema,
                            retryOnJsonParseError,
                            requestedModel,
                            allowModelFallback,
                            transientRetriesRemaining - 1);
                }
                log.error("Gemini Hata Body:\n{}", response.body());
                return new GeminiJsonResult(Optional.empty(), FailureReason.ERROR);
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode usage = root.path("usageMetadata");
            if (!usage.isMissingNode()) {
                log.info("Gemini token kullanımı - prompt: {}, yanıt: {}, toplam: {}",
                        usage.path("promptTokenCount").asInt(0),
                        usage.path("candidatesTokenCount").asInt(0),
                        usage.path("totalTokenCount").asInt(0));
            }

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
                            systemInstruction,
                            buildRetryPrompt(prompt),
                            base64Image,
                            imageMimeType,
                            responseSchema,
                            false,
                            requestedModel,
                            allowModelFallback,
                            transientRetriesRemaining);
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

    private URI buildUri(String requestedModel) {

        String encodedModel = URLEncoder.encode(requestedModel, StandardCharsets.UTF_8);

        String encodedKey = URLEncoder.encode(apiKey, StandardCharsets.UTF_8);

        return URI.create(
                "https://generativelanguage.googleapis.com/v1beta/models/"
                        + encodedModel
                        + ":generateContent?key="
                        + encodedKey);

    }

    private String buildRequest(String systemInstruction,
            String prompt,
            String base64Image,
            String imageMimeType,
            JsonNode responseSchema) throws Exception {

        ObjectNode root = objectMapper.createObjectNode();

        if (systemInstruction != null && !systemInstruction.isBlank()) {
            ObjectNode instruction = root.putObject("systemInstruction");
            instruction.putArray("parts").addObject().put("text", systemInstruction);
        }

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
        if (responseSchema != null) {
            generationConfig.set("responseSchema", responseSchema);
        }

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

    private void sleepBeforeRetry() {
        try {
            Thread.sleep(TRANSIENT_RETRY_DELAY_MS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
