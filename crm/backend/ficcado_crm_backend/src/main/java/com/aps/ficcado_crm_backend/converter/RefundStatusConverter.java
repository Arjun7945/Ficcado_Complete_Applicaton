package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.RefundStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class RefundStatusConverter implements AttributeConverter<RefundStatus, String> {

    @Override
    public String convertToDatabaseColumn(RefundStatus attribute) {
        return attribute != null ? attribute.name() : RefundStatus.PENDING.name();
    }

    @Override
    public RefundStatus convertToEntityAttribute(String dbData) {
        return RefundStatus.fromString(dbData);
    }
}
