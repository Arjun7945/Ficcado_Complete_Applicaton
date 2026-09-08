package com.aps.ficcado_inventory_sales_management_app.converter;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.ItemStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ItemStatusConverter implements AttributeConverter<ItemStatus, String> {

    @Override
    public String convertToDatabaseColumn(ItemStatus attribute) {
        return attribute != null ? attribute.name() : ItemStatus.ACTIVE.name();
    }

    @Override
    public ItemStatus convertToEntityAttribute(String dbData) {
        return ItemStatus.fromString(dbData);
    }
}
