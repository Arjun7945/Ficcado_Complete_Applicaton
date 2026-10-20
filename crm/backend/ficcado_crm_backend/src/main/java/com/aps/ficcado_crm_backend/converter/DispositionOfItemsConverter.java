package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.DispositionOfItems;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class DispositionOfItemsConverter implements AttributeConverter<DispositionOfItems, String> {

    @Override
    public String convertToDatabaseColumn(DispositionOfItems attribute) {
        return attribute != null ? attribute.name() : DispositionOfItems.RETURNED_TO_INVENTORY.name();
    }

    @Override
    public DispositionOfItems convertToEntityAttribute(String dbData) {
        return DispositionOfItems.fromString(dbData);
    }
}
