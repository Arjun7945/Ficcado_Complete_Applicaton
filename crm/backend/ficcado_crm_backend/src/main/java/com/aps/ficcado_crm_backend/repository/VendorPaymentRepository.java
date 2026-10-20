package com.aps.ficcado_crm_backend.repository;

import com.aps.ficcado_crm_backend.entity.VendorPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface VendorPaymentRepository extends JpaRepository<VendorPayment, Long> {

    List<VendorPayment> findByVendorId(Long vendorId);

    @Query("SELECT COALESCE(SUM(vp.amount), 0) FROM VendorPayment vp WHERE vp.paymentDate >= :from AND vp.paymentDate < :to")
    BigDecimal sumVendorPaymentsInRange(@Param("from") LocalDate from, @Param("to") LocalDate to);
}
