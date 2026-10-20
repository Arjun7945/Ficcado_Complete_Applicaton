package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /** Check if a review already exists for a specific purchased line item. */
    boolean existsBySaleLineItem_Id(Long saleLineItemId);

    /** All reviews for a specific item — used for CRM review display. */
    List<Review> findByItem_IdOrderBySubmittedAtDesc(Long itemId);

    /** Find a review for a specific line item — for duplicate prevention. */
    Optional<Review> findBySaleLineItem_Id(Long saleLineItemId);

    /** Count of reviews for a specific item — for aggregate recalculation. */
    long countByItem_Id(Long itemId);
}
