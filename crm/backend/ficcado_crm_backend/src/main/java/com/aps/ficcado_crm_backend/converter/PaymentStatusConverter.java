package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.PaymentStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class PaymentStatusConverter implements AttributeConverter<PaymentStatus, String> {

    @Override
    public String convertToDatabaseColumn(PaymentStatus attribute) {
        return attribute != null ? attribute.name() : PaymentStatus.NOT_PAID.name();
    }

    @Override
    public PaymentStatus convertToEntityAttribute(String dbData) {
        return PaymentStatus.fromString(dbData);
    }
}
