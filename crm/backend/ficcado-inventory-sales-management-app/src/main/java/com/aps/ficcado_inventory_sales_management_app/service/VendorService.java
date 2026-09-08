package com.aps.ficcado_inventory_sales_management_app.service;

import com.aps.ficcado_inventory_sales_management_app.entity.Admin;
import com.aps.ficcado_inventory_sales_management_app.entity.Vendor;
import com.aps.ficcado_inventory_sales_management_app.entity.VendorContactNumber;
import com.aps.ficcado_inventory_sales_management_app.entity.VendorPayment;
import com.aps.ficcado_inventory_sales_management_app.repository.VendorPaymentRepository;
import com.aps.ficcado_inventory_sales_management_app.repository.VendorRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class VendorService {

    private final VendorRepository vendorRepository;
    private final VendorPaymentRepository vendorPaymentRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public List<Vendor> getAllWithContactNumbers() {
        return vendorRepository.findAllWithContactNumbers();
    }

    @Transactional(readOnly = true)
    public Optional<Vendor> getById(Long id) {
        return vendorRepository.findById(id);
    }

    @Transactional
    public Vendor createVendor(String vendorName, String vendorType, String customVendorType,
                               String emailId, String purposeUse, List<String> contactNumbers,
                               Admin admin) {
        Vendor vendor = Vendor.builder()
                .vendorName(vendorName)
                .vendorType(vendorType)
                .customVendorType(customVendorType)
                .emailId(emailId)
                .purposeUse(purposeUse)
                .totalAmountPaid(BigDecimal.ZERO)
                .createdByAdmin(admin)
                .updatedByAdmin(admin)
                .build();

        if (contactNumbers != null) {
            for (String num : contactNumbers) {
                vendor.getContactNumbers().add(
                        VendorContactNumber.builder().vendor(vendor).contactNumber(num).build());
            }
        }

        Vendor saved = vendorRepository.save(vendor);
        activityLogService.log(admin, "CREATE", "VENDORS", "vendors",
                saved.getId().toString(), "Vendor created: " + vendorName);
        return saved;
    }

    @Transactional
    public Optional<Vendor> updateVendor(Long id, String vendorName, String vendorType,
                                         String customVendorType, String emailId,
                                         String purposeUse, List<String> contactNumbers,
                                         Admin admin) {
        return vendorRepository.findById(id).map(vendor -> {
            vendor.setVendorName(vendorName);
            vendor.setVendorType(vendorType);
            vendor.setCustomVendorType(customVendorType);
            vendor.setEmailId(emailId);
            vendor.setPurposeUse(purposeUse);
            vendor.setUpdatedByAdmin(admin);

            if (contactNumbers != null) {
                vendor.getContactNumbers().clear();
                for (String num : contactNumbers) {
                    vendor.getContactNumbers().add(
                            VendorContactNumber.builder().vendor(vendor).contactNumber(num).build());
                }
            }

            Vendor saved = vendorRepository.save(vendor);
            activityLogService.log(admin, "UPDATE", "VENDORS", "vendors",
                    id.toString(), "Vendor updated: " + vendorName);
            return saved;
        });
    }

    @Transactional
    public boolean deleteVendor(Long id, Admin admin) {
        return vendorRepository.findById(id).map(v -> {
            activityLogService.log(admin, "DELETE", "VENDORS", "vendors",
                    id.toString(), "Vendor deleted: " + v.getVendorName());
            vendorRepository.deleteById(id);
            return true;
        }).orElse(false);
    }

    @Transactional(readOnly = true)
    public List<VendorPayment> getPayments(Long vendorId) {
        return vendorPaymentRepository.findByVendorId(vendorId);
    }

    @Transactional
    public VendorPayment addPayment(Long vendorId, BigDecimal amount, LocalDate paymentDate,
                                    String note, Admin admin) {
        Vendor vendor = vendorRepository.findById(vendorId)
                .orElseThrow(() -> new IllegalArgumentException("Vendor not found: " + vendorId));

        BigDecimal paymentAmount = amount != null ? amount : BigDecimal.ZERO;

        VendorPayment payment = VendorPayment.builder()
                .vendor(vendor)
                .vendorName(vendor.getVendorName())
                .amount(paymentAmount)
                .paymentDate(paymentDate)
                .note(note)
                .createdByAdmin(admin)
                .build();
        VendorPayment saved = vendorPaymentRepository.save(payment);

        vendor.setTotalAmountPaid(vendor.getTotalAmountPaid().add(paymentAmount));
        vendorRepository.save(vendor);

        activityLogService.log(admin, "PAYMENT", "VENDORS", "vendors",
                vendorId.toString(),
                "Payment of ₹" + paymentAmount + " recorded for " + vendor.getVendorName());

        return saved;
    }
}
