package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.VendorType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class VendorTypeConverter implements AttributeConverter<VendorType, String> {

    @Override
    public String convertToDatabaseColumn(VendorType attribute) {
        return attribute != null ? attribute.name() : VendorType.OTHER.name();
    }

    @Override
    public VendorType convertToEntityAttribute(String dbData) {
        return VendorType.fromString(dbData);
    }
}
