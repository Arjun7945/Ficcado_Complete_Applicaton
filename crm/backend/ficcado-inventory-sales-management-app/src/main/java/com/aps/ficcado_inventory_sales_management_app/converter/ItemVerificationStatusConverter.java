package com.aps.ficcado_inventory_sales_management_app.converter;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.ItemVerificationStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ItemVerificationStatusConverter implements AttributeConverter<ItemVerificationStatus, String> {

    @Override
    public String convertToDatabaseColumn(ItemVerificationStatus attribute) {
        return attribute != null ? attribute.name() : ItemVerificationStatus.PENDING.name();
    }

    @Override
    public ItemVerificationStatus convertToEntityAttribute(String dbData) {
        return ItemVerificationStatus.fromString(dbData);
    }
}
