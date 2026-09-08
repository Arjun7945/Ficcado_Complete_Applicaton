package com.aps.ficcado_inventory_sales_management_app.converter;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.DispositionOfItems;
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
