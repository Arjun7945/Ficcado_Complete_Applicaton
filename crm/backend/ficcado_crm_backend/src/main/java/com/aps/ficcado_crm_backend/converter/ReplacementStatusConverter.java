package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.ReplacementStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ReplacementStatusConverter implements AttributeConverter<ReplacementStatus, String> {

    @Override
    public String convertToDatabaseColumn(ReplacementStatus attribute) {
        return attribute != null ? attribute.name() : ReplacementStatus.REPLACEMENT_APPROVED.name();
    }

    @Override
    public ReplacementStatus convertToEntityAttribute(String dbData) {
        return ReplacementStatus.fromString(dbData);
    }
}
