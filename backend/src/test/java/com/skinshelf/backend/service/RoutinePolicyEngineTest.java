package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.AssistantRoutineStep;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.service.RoutinePolicyEngine.RoutinePlan;
import com.skinshelf.backend.service.ShellyPromptService.ShellyMode;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RoutinePolicyEngineTest {

    private final RoutinePolicyEngine engine = new RoutinePolicyEngine();

    @Test
    void weeklyPlanSeparatesRetinoidAndExfoliantWithoutRedundantConflictWarning() {
        RoutinePlan plan = engine.buildPlan(
                ShellyMode.WEEKLY_PLAN,
                List.of(
                        product(1L, "Retinol Serum", "Serum", "both", "Retinol"),
                        product(2L, "BHA Tonik", "Tonik", "evening", "Salicylic Acid")),
                new UserProfile());

        assertTrue(hasProductAt(plan.steps(), 1L, "MONDAY_EVENING"));
        assertTrue(hasProductAt(plan.steps(), 2L, "THURSDAY_EVENING"));
        assertTrue(plan.warnings().stream().noneMatch(warning -> warning.contains("aynı gece")));
    }

    @Test
    void pregnancyExcludesRetinoidFromExecutableSteps() {
        UserProfile profile = new UserProfile();
        profile.setPregnant(true);

        RoutinePlan plan = engine.buildPlan(
                ShellyMode.WEEKLY_PLAN,
                List.of(product(1L, "Retinol Serum", "Serum", "evening", "Retinol")),
                profile);

        assertFalse(plan.steps().stream().anyMatch(step -> Long.valueOf(1L).equals(step.productId())));
        assertTrue(plan.warnings().stream().anyMatch(warning -> warning.contains("plana eklenmedi")));
    }

    @Test
    void inactiveProductsNeverEnterRoutine() {
        Product inactive = product(3L, "Pasif Serum", "Serum", "both", "Niacinamide");
        inactive.setIsActive(false);

        RoutinePlan plan = engine.buildPlan(ShellyMode.ROUTINE_CHECK, List.of(inactive), new UserProfile());

        assertFalse(plan.steps().stream().anyMatch(step -> Long.valueOf(3L).equals(step.productId())));
    }

    @Test
    void multipleProductsFromSameStrongFamilyAreNotStacked() {
        RoutinePlan plan = engine.buildPlan(
                ShellyMode.WEEKLY_PLAN,
                List.of(
                        product(4L, "BHA Tonik", "Tonik", "evening", "BHA"),
                        product(5L, "AHA Serum", "Serum", "evening", "Glycolic Acid")),
                new UserProfile());

        long scheduledStrongProducts = plan.steps().stream()
                .filter(step -> Long.valueOf(4L).equals(step.productId()) || Long.valueOf(5L).equals(step.productId()))
                .count();
        assertEquals(1, scheduledStrongProducts);
        assertTrue(plan.warnings().stream().anyMatch(warning -> warning.contains("yalnız birini")));
    }

    @Test
    void sunscreenIsAlwaysLastMorningStep() {
        RoutinePlan plan = engine.buildPlan(
                ShellyMode.ROUTINE_CHECK,
                List.of(
                        product(6L, "Nazik Temizleyici", "Temizleyici", "both", "Glycerin"),
                        product(7L, "Daily SPF 50", "Güneş Kremi", "both", "UV Filters")),
                new UserProfile());

        List<AssistantRoutineStep> morning = plan.steps().stream()
                .filter(step -> step.period().equals("MORNING") && step.status().equals("IN_SHELF"))
                .toList();
        assertEquals(7L, morning.get(morning.size() - 1).productId());
    }

    private boolean hasProductAt(List<AssistantRoutineStep> steps, Long productId, String period) {
        return steps.stream().anyMatch(step -> productId.equals(step.productId()) && period.equals(step.period()));
    }

    private Product product(Long id, String name, String category, String timeOfDay, String... ingredients) {
        Product product = new Product();
        product.setId(id);
        product.setBrand("SkinShelf");
        product.setName(name);
        product.setCategory(category);
        product.setTimeOfDay(timeOfDay);
        product.setActiveIngredients(List.of(ingredients));
        product.setIsActive(true);
        return product;
    }
}
