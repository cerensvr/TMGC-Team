package com.skinshelf.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ProductRecognitionRequest {

    /** Data URI öneki olmadan Base64 kodlu ürün fotoğrafı. */
    @NotBlank(message = "Ürün fotoğrafı zorunludur.")
    @Size(max = 8_000_000, message = "Ürün fotoğrafı çok büyük.")
    private String imageBase64;

    @Pattern(
            regexp = "image/(jpeg|jpg|png|webp)",
            flags = Pattern.Flag.CASE_INSENSITIVE,
            message = "Desteklenmeyen fotoğraf biçimi.")
    private String imageMimeType;
}
