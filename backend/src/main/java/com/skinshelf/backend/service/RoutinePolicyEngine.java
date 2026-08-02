package com.skinshelf.backend.service;

import com.skinshelf.backend.dto.AssistantRoutineStep;
import com.skinshelf.backend.entity.Product;
import com.skinshelf.backend.entity.UserProfile;
import com.skinshelf.backend.service.ShellyPromptService.ShellyMode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Üretken modelden bağımsız rutin kuralları. Shelly açıklamayı üretir; bu motor
 * dolap sahipliğini, ürün durumunu ve güçlü aktiflerin zamanlamasını belirler.
 */
@Component
public class RoutinePolicyEngine {

    public record RoutinePlan(List<AssistantRoutineStep> steps, List<String> warnings) {
        public RoutinePlan {
            steps = steps == null ? List.of() : List.copyOf(steps);
            warnings = warnings == null ? List.of() : List.copyOf(warnings);
        }

        public static RoutinePlan empty() {
            return new RoutinePlan(List.of(), List.of());
        }
    }

    private record PlannedProduct(String period, Product product, String instruction) {
    }

    private enum ActiveFamily {
        RETINOID,
        STRONG_TREATMENT,
        NONE
    }

    public RoutinePlan buildPlan(ShellyMode mode, List<Product> products, UserProfile profile) {
        if (mode != ShellyMode.ROUTINE_CHECK && mode != ShellyMode.WEEKLY_PLAN) {
            return RoutinePlan.empty();
        }

        List<Product> activeProducts = products == null
                ? List.of()
                : products.stream()
                        .filter(this::isRoutineActive)
                        .sorted(Comparator.comparingInt(this::routineOrder))
                        .toList();
        List<Product> retinoids = activeProducts.stream()
                .filter(product -> activeFamily(product) == ActiveFamily.RETINOID)
                .toList();
        List<Product> strongTreatments = activeProducts.stream()
                .filter(product -> activeFamily(product) == ActiveFamily.STRONG_TREATMENT)
                .toList();
        List<String> warnings = new ArrayList<>();
        List<PlannedProduct> planned = new ArrayList<>();

        activeProducts.stream()
                .filter(product -> activeFamily(product) == ActiveFamily.NONE)
                .forEach(product -> routinePeriods(product).forEach(period -> planned.add(
                        new PlannedProduct(period, product, routineInstruction(product, period)))));

        if (Boolean.TRUE.equals(profile == null ? null : profile.getPregnant()) && !retinoids.isEmpty()) {
            warnings.add("Profilindeki gebelik bilgisi nedeniyle retinoid içeren ürün plana eklenmedi; kullanmadan önce sağlık profesyoneline danış.");
        } else if (!retinoids.isEmpty()) {
            Product selectedRetinoid = retinoids.get(0);
            String period = mode == ShellyMode.WEEKLY_PLAN
                    ? "MONDAY_EVENING"
                    : strongTreatments.isEmpty() ? "EVENING" : "ALTERNATE_EVENING";
            planned.add(new PlannedProduct(period, selectedRetinoid,
                    "Tek güçlü aktif olarak planlanan gecede kullan; toleransını izle."));
            if (retinoids.size() > 1) {
                warnings.add("Dolabında birden fazla retinoid var; otomatik plan yalnız birini kullandı.");
            }
        }

        if (!strongTreatments.isEmpty()) {
            Product selectedTreatment = strongTreatments.get(0);
            String period = mode == ShellyMode.WEEKLY_PLAN
                    ? "THURSDAY_EVENING"
                    : retinoids.isEmpty() ? "EVENING" : "OTHER_EVENING";
            planned.add(new PlannedProduct(period, selectedTreatment,
                    retinoids.isEmpty()
                            ? "Akşam tek güçlü aktif olarak kullan; toleransını izle."
                            : "Retinoid ürününden ayrı bir gecede kullan."));
            if (strongTreatments.size() > 1) {
                warnings.add("Dolabında birden fazla güçlü asit/akne ürünü var; otomatik plan yalnız birini kullandı.");
            }
        }

        List<AssistantRoutineStep> steps = toOrderedSteps(planned);
        addMissingBaseSteps(steps, activeProducts);
        return new RoutinePlan(steps.stream().limit(14).toList(), warnings.stream().distinct().limit(4).toList());
    }

    private List<AssistantRoutineStep> toOrderedSteps(List<PlannedProduct> planned) {
        Map<String, List<PlannedProduct>> groups = new LinkedHashMap<>();
        planned.forEach(item -> groups.computeIfAbsent(item.period(), ignored -> new ArrayList<>()).add(item));

        List<AssistantRoutineStep> steps = new ArrayList<>();
        groups.forEach((period, products) -> {
            products.sort(Comparator.comparingInt(item -> routineOrder(item.product())));
            for (int index = 0; index < products.size(); index++) {
                PlannedProduct item = products.get(index);
                steps.add(new AssistantRoutineStep(
                        period,
                        index + 1,
                        item.product().getId(),
                        productName(item.product()),
                        "IN_SHELF",
                        item.instruction()));
            }
        });
        return steps;
    }

    private void addMissingBaseSteps(List<AssistantRoutineStep> steps, List<Product> products) {
        if (!hasProductCategory(products, "temizley", "cleanser", "cleansing")) {
            addMissingStep(steps, "MORNING", "Nazik temizleyici", "Temel temizleme adımı eksik.");
            addMissingStep(steps, "EVENING", "Nazik temizleyici", "Gün sonu temizleme adımı eksik.");
        }
        if (!hasProductCategory(products, "nemlendir", "moistur", "cream", "krem")) {
            addMissingStep(steps, "MORNING", "Nemlendirici", "Bariyer desteği adımı eksik.");
            addMissingStep(steps, "EVENING", "Nemlendirici", "Aktiflerden sonra nem desteği eksik.");
        }
        if (!hasProductCategory(products, "güneş", "gunes", "sunscreen", "spf")) {
            addMissingStep(steps, "MORNING", "Güneş koruyucu (SPF)", "Sabah rutininin son koruma adımı eksik.");
        }
    }

    private void addMissingStep(List<AssistantRoutineStep> steps, String period, String label, String instruction) {
        int order = (int) steps.stream().filter(step -> step.period().equals(period)).count() + 1;
        steps.add(new AssistantRoutineStep(period, order, null, label, "MISSING", instruction));
    }

    private List<String> routinePeriods(Product product) {
        String time = normalize(product.getTimeOfDay());
        if (hasProductCategory(List.of(product), "güneş", "gunes", "sunscreen", "spf")) {
            return List.of("MORNING");
        }
        if ("morning".equals(time)) return List.of("MORNING");
        if ("evening".equals(time)) return List.of("EVENING");
        return List.of("MORNING", "EVENING");
    }

    private ActiveFamily activeFamily(Product product) {
        String text = productText(product);
        if (matchesAny(text, "retinol", "retinal", "retinoid", "tretinoin")) {
            return ActiveFamily.RETINOID;
        }
        if (matchesAny(text,
                "aha", "bha", "salicylic", "salisilik", "glycolic", "glikolik",
                "lactic", "laktik", "mandelic", "benzoyl", "benzoil", "peeling")) {
            return ActiveFamily.STRONG_TREATMENT;
        }
        return ActiveFamily.NONE;
    }

    private String routineInstruction(Product product, String period) {
        String text = productText(product);
        if (matchesAny(text, "temizley", "cleanser", "cleansing")) {
            return "Rutinin ilk adımında nazikçe temizle.";
        }
        if (matchesAny(text, "güneş", "gunes", "sunscreen", "spf")) {
            return "Sabah rutininin son adımı olarak uygula.";
        }
        if (matchesAny(text, "nemlendir", "moistur", "cream", "krem", "ceramide", "seramid")) {
            return "Aktiflerden sonra bariyer desteği için uygula.";
        }
        return "İnce yapıdan yoğun yapıya doğru uygula.";
    }

    private int routineOrder(Product product) {
        String text = productText(product);
        if (matchesAny(text, "temizley", "cleanser", "cleansing")) return 10;
        if (matchesAny(text, "tonik", "toner")) return 20;
        if (activeFamily(product) != ActiveFamily.NONE || matchesAny(text, "serum")) return 30;
        if (matchesAny(text, "göz", "goz", "eye")) return 40;
        if (matchesAny(text, "nemlendir", "moistur", "cream", "krem")) return 50;
        if (matchesAny(text, "güneş", "gunes", "sunscreen", "spf")) return 60;
        return 45;
    }

    private boolean hasProductCategory(List<Product> products, String... terms) {
        return products.stream().map(this::productText).anyMatch(text -> matchesAny(text, terms));
    }

    private boolean isRoutineActive(Product product) {
        return product != null && !Boolean.FALSE.equals(product.getIsActive());
    }

    private String productName(Product product) {
        return (value(product.getBrand()) + " " + value(product.getName())).trim();
    }

    private String productText(Product product) {
        String ingredients = product.getActiveIngredients() == null
                ? ""
                : String.join(" ", product.getActiveIngredients());
        return normalize(value(product.getBrand()) + " " + value(product.getName()) + " "
                + value(product.getCategory()) + " " + value(product.getDescription()) + " " + ingredients);
    }

    private boolean matchesAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) return true;
        }
        return false;
    }

    private String normalize(String value) {
        return value(value).toLowerCase(Locale.forLanguageTag("tr-TR"));
    }

    private String value(String value) {
        return value == null ? "" : value.trim();
    }
}
