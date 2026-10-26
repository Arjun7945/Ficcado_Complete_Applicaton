package com.aps.ficcado_crm_backend.service;

import com.aps.ficcado_crm_backend.dto.DeliveryOptionDto.DeliveryOptionResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Delivery & Courier Options Service.
 * Implements ADD-4 server-side delivery charge computation.
 * Configuration-driven source of truth in Ficcado-Data.
 */
@Slf4j
@Service
@ConfigurationProperties(prefix = "app.delivery")
public class DeliveryService {

    public static class OptionConfig {
        private String id;
        private String name;
        private BigDecimal rate;
        private String deliveryTime;
        private String status;

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public BigDecimal getRate() { return rate; }
        public void setRate(BigDecimal rate) { this.rate = rate; }
        public String getDeliveryTime() { return deliveryTime; }
        public void setDeliveryTime(String deliveryTime) { this.deliveryTime = deliveryTime; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    private List<OptionConfig> options = new ArrayList<>();

    public List<OptionConfig> getOptions() {
        return options;
    }

    public void setOptions(List<OptionConfig> options) {
        this.options = options != null ? options : new ArrayList<>();
    }

    /**
     * Returns all active delivery options for public storefront consumption.
     */
    public List<DeliveryOptionResponse> getActiveDeliveryOptions() {
        if (options == null || options.isEmpty()) {
            return getDefaultOptions();
        }

        return options.stream()
                .filter(o -> "ACTIVE".equalsIgnoreCase(o.getStatus()))
                .map(o -> new DeliveryOptionResponse(
                        o.getId(),
                        o.getName(),
                        o.getRate() != null ? o.getRate() : BigDecimal.ZERO,
                        o.getDeliveryTime(),
                        o.getStatus()
                ))
                .toList();
    }

    /**
     * Looks up server-configured delivery charge for a selected courier.
     * Always computed on the server; client-supplied charges are ignored.
     */
    public BigDecimal calculateDeliveryCharge(String courierId) {
        if (courierId == null || courierId.isBlank() || "del-standard".equalsIgnoreCase(courierId.trim())) {
            return BigDecimal.ZERO;
        }

        String target = courierId.trim();
        Optional<OptionConfig> match = options.stream()
                .filter(o -> target.equalsIgnoreCase(o.getId()))
                .findFirst();

        if (match.isPresent()) {
            OptionConfig opt = match.get();
            if (!"ACTIVE".equalsIgnoreCase(opt.getStatus())) {
                throw new IllegalArgumentException("Selected courier option is currently inactive: " + courierId);
            }
            return opt.getRate() != null ? opt.getRate() : BigDecimal.ZERO;
        }

        // Check fallback if options list empty
        if ("del-priority".equalsIgnoreCase(target)) {
            return BigDecimal.valueOf(99);
        }

        throw new IllegalArgumentException("Unknown courier option: " + courierId);
    }

    /**
     * Resolves human-readable name for selected courier ID.
     */
    public String resolveCourierName(String courierId) {
        if (courierId == null || courierId.isBlank() || "del-standard".equalsIgnoreCase(courierId.trim())) {
            return "Express Surface Logistics";
        }

        String target = courierId.trim();
        return options.stream()
                .filter(o -> target.equalsIgnoreCase(o.getId()))
                .map(OptionConfig::getName)
                .findFirst()
                .orElse("del-priority".equalsIgnoreCase(target) ? "Priority Air Courier" : target);
    }

    private List<DeliveryOptionResponse> getDefaultOptions() {
        return List.of(
                new DeliveryOptionResponse("del-standard", "Express Surface Logistics", BigDecimal.ZERO, "3–5 Business Days", "ACTIVE"),
                new DeliveryOptionResponse("del-priority", "Priority Air Courier", BigDecimal.valueOf(99), "1–2 Business Days", "ACTIVE")
        );
    }
}
