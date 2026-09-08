package com.aps.ficcado_inventory_sales_management_app.converter;

import com.aps.ficcado_inventory_sales_management_app.entity.enums.SaleStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class SaleStatusConverter implements AttributeConverter<SaleStatus, String> {

    @Override
    public String convertToDatabaseColumn(SaleStatus attribute) {
        return attribute != null ? attribute.name() : SaleStatus.NOT_PROVIDED_OR_ORDER_ONLY_PLACED.name();
    }

    @Override
    public SaleStatus convertToEntityAttribute(String dbData) {
        return SaleStatus.fromString(dbData);
    }
}
