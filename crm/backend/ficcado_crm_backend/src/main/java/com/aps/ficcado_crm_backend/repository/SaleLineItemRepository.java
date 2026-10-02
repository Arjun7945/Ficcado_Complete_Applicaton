package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.SaleLineItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SaleLineItemRepository extends JpaRepository<SaleLineItem, Long> {

    /** All line items for a given sale. */
    List<SaleLineItem> findBySaleId(Long saleId);
}
