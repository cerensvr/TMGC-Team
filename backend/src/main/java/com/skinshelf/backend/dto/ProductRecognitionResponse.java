package com.skinshelf.backend.dto;

import com.skinshelf.backend.entity.Product;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class ProductRecognitionResponse {
    private String name;
    private String brand;
    private String category;
    private String timeOfDay;
    private String imageUrl;
    private String cutoutImageUrl;
    private String description;
    private List<String> activeIngredients;
    private String confidence;
    private boolean matchedFromShelf;

    public static ProductRecognitionResponse fromShelf(Product product, String confidence) {
        return new ProductRecognitionResponse(
                product.getName(),
                product.getBrand(),
                product.getCategory(),
                product.getTimeOfDay(),
                product.getImageUrl() == null ? "" : product.getImageUrl(),
                product.getCutoutImageUrl(),
                product.getDescription() == null ? "" : product.getDescription(),
                product.getActiveIngredients() == null ? List.of() : product.getActiveIngredients(),
                confidence,
                true);
    }
}
