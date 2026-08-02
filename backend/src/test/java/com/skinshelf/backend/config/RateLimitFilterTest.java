package com.skinshelf.backend.config;

import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;

class RateLimitFilterTest {

    @Test
    void limitsRepeatedLoginRequestsPerClientAndEndpoint() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(true);

        for (int attempt = 1; attempt <= 10; attempt++) {
            MockHttpServletResponse response = invoke(filter, "POST", "/api/auth/login", "203.0.113.10");
            assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        }

        MockHttpServletResponse limited = invoke(filter, "POST", "/api/auth/login", "203.0.113.10");
        assertEquals(HttpStatus.TOO_MANY_REQUESTS.value(), limited.getStatus());
        assertEquals("application/json", limited.getContentType());
    }

    @Test
    void doesNotLimitUnconfiguredReadEndpoints() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(true);

        for (int attempt = 0; attempt < 20; attempt++) {
            MockHttpServletResponse response = invoke(filter, "GET", "/api/products", "203.0.113.20");
            assertEquals(HttpServletResponse.SC_OK, response.getStatus());
        }
    }

    private MockHttpServletResponse invoke(
            RateLimitFilter filter,
            String method,
            String path,
            String forwardedFor) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        request.addHeader("X-Forwarded-For", forwardedFor);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilterInternal(request, response, new MockFilterChain());
        return response;
    }
}
