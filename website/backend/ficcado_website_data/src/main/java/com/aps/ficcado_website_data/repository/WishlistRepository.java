package com.aps.ficcado_website_data.repository;

import com.aps.ficcado_website_data.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishlistRepository extends JpaRepository<WishlistItem, Long> {

    List<WishlistItem> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<WishlistItem> findByCustomerIdAndItemId(Long customerId, Long itemId);

    long countByCustomerId(Long customerId);

    @Modifying
    @Query("DELETE FROM WishlistItem w WHERE w.customerId = :customerId AND w.itemId = :itemId")
    void deleteByCustomerIdAndItemId(@Param("customerId") Long customerId, @Param("itemId") Long itemId);
}
