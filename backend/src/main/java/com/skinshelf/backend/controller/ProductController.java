package com.skinshelf.backend.controller;

import com.skinshelf.backend.dto.ProductRequest;
import com.skinshelf.backend.dto.ProductRecognitionRequest;
import com.skinshelf.backend.dto.ProductRecognitionResponse;
import com.skinshelf.backend.dto.ProductResponse;
import com.skinshelf.backend.entity.User;
import com.skinshelf.backend.service.ProductRecognitionService;
import com.skinshelf.backend.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductRecognitionService productRecognitionService;

    public ProductController(ProductService productService, ProductRecognitionService productRecognitionService) {
        this.productService = productService;
        this.productRecognitionService = productRecognitionService;
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getProducts(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(productService.getProducts(currentUser));
    }

    @PostMapping("/recognize")
    public ResponseEntity<ProductRecognitionResponse> recognizeProduct(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ProductRecognitionRequest request) {
        return ResponseEntity.ok(productRecognitionService.recognize(currentUser, request));
    }

    @GetMapping("/{productId}")
    public ResponseEntity<ProductResponse> getProduct(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long productId) {
        return ResponseEntity.ok(productService.getProduct(currentUser, productId));
    }

    @PostMapping
    public ResponseEntity<ProductResponse> addProduct(
            @AuthenticationPrincipal User currentUser,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.addProduct(currentUser, request));
    }

    @PutMapping("/{productId}")
    public ResponseEntity<ProductResponse> updateProduct(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long productId,
            @Valid @RequestBody ProductRequest request) {
        return ResponseEntity.ok(productService.updateProduct(currentUser, productId, request));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<Void> deleteProduct(
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long productId) {
        productService.deleteProduct(currentUser, productId);
        return ResponseEntity.noContent().build();
    }
}
