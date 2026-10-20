package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.ReviewDto.ReviewResponse;
import com.aps.ficcado_crm_backend.entity.Review;

public final class ReviewMapper {

    private ReviewMapper() {}

    public static ReviewResponse toResponse(Review r) {
        if (r == null) return null;
        return new ReviewResponse(
                r.getId(),
                r.getItem() != null ? r.getItem().getId() : null,
                r.getItem() != null ? r.getItem().getItemName() : null,
                r.getCustomer() != null ? r.getCustomer().getId() : null,
                r.getCustomer() != null ? r.getCustomer().getCustomerName() : null,
                r.getStarRating() != null ? r.getStarRating() : 0,
                r.getComment(),
                r.getSubmittedAt()
        );
    }
}
