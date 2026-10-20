package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.ExpenseCategory;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class ExpenseCategoryConverter implements AttributeConverter<ExpenseCategory, String> {

    @Override
    public String convertToDatabaseColumn(ExpenseCategory attribute) {
        return attribute != null ? attribute.name() : ExpenseCategory.OTHER.name();
    }

    @Override
    public ExpenseCategory convertToEntityAttribute(String dbData) {
        return ExpenseCategory.fromString(dbData);
    }
}
