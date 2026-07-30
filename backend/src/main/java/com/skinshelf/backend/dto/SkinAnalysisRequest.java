package com.skinshelf.backend.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SkinAnalysisRequest {
    /** Base64 kodlu fotoğraf (data URI öneki olmadan). */
    private String imageBase64;
    private String imageMimeType;
    private String skinFeeling;
    private Boolean usedNewProduct;
    private String userNote;
}