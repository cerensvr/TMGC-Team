package com.skinshelf.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class SkinAnalysisResponse {
    private Long logId;
    private String title;
    private String summary;
    /** redness / dryness / oiliness / blemishAppearance / irritationAppearance -> low|medium|high|unknown */
    private Map<String, String> visibleChanges;
    /** good / acceptable / poor / unknown. Poor photos are not used in longitudinal comparisons. */
    private String photoQuality;
    private String photoQualityNote;
    private String routineConnection;
    private String suggestion;
    private String warning;
    private String riskLevel;
    private List<String> tags;
    /** Önceki kayıtla karşılaştırma: increased|decreased|stable|unknown. */
    private Map<String, String> comparedToPrevious;
    private String comparisonSummary;
    private List<String> usedContext;
    private boolean fallbackUsed;
    private String createdAt;
}
