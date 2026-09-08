package com.aps.ficcado_inventory_sales_management_app.repository;

import com.aps.ficcado_inventory_sales_management_app.entity.Vendor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface VendorRepository extends JpaRepository<Vendor, Long> {

    List<Vendor> findByVendorNameContainingIgnoreCaseOrPurposeUseContainingIgnoreCase(
            String name, String purpose);

    List<Vendor> findByVendorType(String vendorType);

    @Query("SELECT v FROM Vendor v LEFT JOIN FETCH v.contactNumbers ORDER BY v.vendorName ASC")
    List<Vendor> findAllWithContactNumbers();
}
