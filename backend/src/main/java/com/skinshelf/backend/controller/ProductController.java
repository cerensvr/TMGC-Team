package com.skinshelf.backend.controller;

import com.skinshelf.backend.dto.ProductRequest;
import com.skinshelf.backend.dto.ProductResponse;
import com.skinshelf.backend.entity.User;
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

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getProducts(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(productService.getProducts(currentUser));
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
