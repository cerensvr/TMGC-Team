package com.skinshelf.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private static final String LOCAL_ORIGINS =
            "http://localhost:3000,http://localhost:8081,http://127.0.0.1:3000";

    private final String[] allowedOrigins;

    public WebConfig(@Value("${app.cors.allowed-origins:" + LOCAL_ORIGINS + "}") String allowedOrigins) {
        this.allowedOrigins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isBlank())
                .toArray(String[]::new);
        if (this.allowedOrigins.length == 0) {
            throw new IllegalStateException("CORS_ALLOWED_ORIGINS en az bir origin içermelidir.");
        }
        if (Arrays.asList(this.allowedOrigins).contains("*")) {
            throw new IllegalStateException("Production CORS yapılandırmasında wildcard (*) kullanılamaz.");
        }
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Tüm API istekleri için geçerli
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // İzin verilen HTTP metotları
                .allowedHeaders("*") // Tüm HTTP başlıklarına izin ver
                .maxAge(3600); // Ön istek (Preflight) önbellekleme süresi (1 saat)
    }
}
