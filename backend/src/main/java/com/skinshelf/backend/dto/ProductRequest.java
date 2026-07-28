package com.skinshelf.backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class ProductRequest {
    @NotBlank(message = "Ürün adı zorunludur.")
    @Size(max = 255, message = "Ürün adı en fazla 255 karakter olabilir.")
    private String name;

    @NotBlank(message = "Marka zorunludur.")
    @Size(max = 255, message = "Marka en fazla 255 karakter olabilir.")
    private String brand;

    @NotBlank(message = "Kategori zorunludur.")
    @Pattern(
            regexp = "Temizleyici|Tonik|Serum|Göz Kremi|Nemlendirici|Güneş Kremi|Maske|Diğer",
            message = "Geçersiz ürün kategorisi.")
    private String category;

    @NotBlank(message = "Kullanım zamanı zorunludur.")
    @Pattern(regexp = "morning|evening|both", message = "Geçersiz kullanım zamanı.")
    private String timeOfDay;

    private String imageUrl;
    private String cutoutImageUrl;
    private String description;
    private String expiryDate;
    private List<String> activeIngredients;
    private Boolean isFavorite;

    @JsonAlias("is_active")
    private Boolean isActive;
}
