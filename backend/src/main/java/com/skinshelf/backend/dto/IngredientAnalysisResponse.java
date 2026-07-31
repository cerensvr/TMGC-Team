package com.skinshelf.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class IngredientAnalysisResponse {
    private String summary;
    private String compatibilityLevel;
    private String compatibilityMessage;
    private String suggestedTimeOfDay;
    private List<String> notableIngredients;
    private List<String> warnings;
    private List<IngredientConflictDetail> conflicts;
}
