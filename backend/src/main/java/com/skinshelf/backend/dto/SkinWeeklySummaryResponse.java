package com.skinshelf.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;
import java.util.Map;

@Getter
@AllArgsConstructor
public class SkinWeeklySummaryResponse {
    private int logCount;
    private int comparableLogCount;
    private int previousWeekComparableLogCount;
    /** dryness / redness / oiliness / blemish / irritation -> increased|decreased|stable|unknown */
    private Map<String, String> trends;
    private List<String> newProducts;
    private List<String> monitoredActives;
    /** continue / reduce / pause / observe / not_applicable */
    private String guidanceStatus;
    private String activeGuidance;
    private String shellyComment;
}
