package com.skinshelf.backend.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

@RestController
@RequestMapping("/legal")
public class LegalDocumentController {

    @GetMapping(value = {"/privacy", "/privacy/"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> privacyPolicy() {
        return document("privacy.html");
    }

    @GetMapping(value = {"/terms", "/terms/"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> termsOfUse() {
        return document("terms.html");
    }

    @GetMapping(value = {"/data-deletion", "/data-deletion/"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<Resource> dataDeletion() {
        return document("data-deletion.html");
    }

    private ResponseEntity<Resource> document(String fileName) {
        Resource resource = new ClassPathResource("static/legal/" + fileName);
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_HTML)
                .cacheControl(CacheControl.maxAge(Duration.ofHours(1)).cachePublic())
                .body(resource);
    }
}
