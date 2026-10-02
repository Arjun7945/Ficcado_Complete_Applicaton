package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.VendorDto.PaymentResponse;
import com.aps.ficcado_crm_backend.dto.VendorDto.VendorResponse;
import com.aps.ficcado_crm_backend.entity.Vendor;
import com.aps.ficcado_crm_backend.entity.VendorContactNumber;
import com.aps.ficcado_crm_backend.entity.VendorPayment;

import java.util.Collections;

public final class VendorMapper {

    private VendorMapper() {}

    public static VendorResponse toResponse(Vendor v) {
        if (v == null) return null;
        return new VendorResponse(
                v.getId(),
                v.getVendorName(),
                v.getVendorType(),
                v.getCustomVendorType(),
                v.getEmailId(),
                v.getPurposeUse(),
                v.getTotalAmountPaid(),
                v.getContactNumbers() != null
                        ? v.getContactNumbers().stream().map(VendorContactNumber::getContactNumber).toList()
                        : Collections.emptyList(),
                v.getCreatedAt(),
                v.getUpdatedAt()
        );
    }

    public static PaymentResponse toPaymentResponse(VendorPayment p) {
        if (p == null) return null;
        return new PaymentResponse(
                p.getId(),
                p.getVendor() != null ? p.getVendor().getId() : null,
                p.getVendorName(),
                p.getAmount(),
                p.getPaymentDate(),
                p.getNote(),
                p.getCreatedAt()
        );
    }
}
