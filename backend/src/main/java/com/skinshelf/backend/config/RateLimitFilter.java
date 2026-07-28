package com.skinshelf.backend.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Counter> counters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        Limit limit = limitFor(request);
        if (limit == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String key = clientIp(request) + ":" + request.getMethod() + ":" + request.getRequestURI();
        if (!allow(key, limit)) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private Limit limitFor(HttpServletRequest request) {
        String method = request.getMethod();
        String path = request.getRequestURI();

        if ("POST".equals(method) && ("/api/auth/login".equals(path) || "/api/auth/register".equals(path))) {
            return new Limit(10, 60);
        }
        if ("POST".equals(method) && "/api/assistant/chat".equals(path)) {
            // Ücretsiz Gemini kotasını tek kullanıcının hızlı tekrarlarından korur.
            // Kota aşılırsa AssistantService ayrıca kişisel fallback üretir.
            return new Limit(10, 60);
        }
        if ("POST".equals(method) && "/api/skin-logs/analyze".equals(path)) {
            return new Limit(8, 60);
        }
        return null;
    }

    private boolean allow(String key, Limit limit) {
        long now = Instant.now().getEpochSecond();
        Counter counter = counters.computeIfAbsent(key, ignored -> new Counter(now));

        synchronized (counter) {
            if (now - counter.windowStart >= limit.windowSeconds()) {
                counter.windowStart = now;
                counter.count.set(0);
            }
            return counter.count.incrementAndGet() <= limit.maxRequests();
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record Limit(int maxRequests, int windowSeconds) {
    }

    private static final class Counter {
        private volatile long windowStart;
        private final AtomicInteger count = new AtomicInteger();

        private Counter(long windowStart) {
            this.windowStart = windowStart;
        }
    }
}
