package com.aps.ficcado_crm_backend.converter;

import com.aps.ficcado_crm_backend.entity.enums.DeliveryStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = true)
public class DeliveryStatusConverter implements AttributeConverter<DeliveryStatus, String> {

    @Override
    public String convertToDatabaseColumn(DeliveryStatus attribute) {
        return attribute != null ? attribute.name() : DeliveryStatus.PACKED_AND_READY_FOR_SHIPMENT.name();
    }

    @Override
    public DeliveryStatus convertToEntityAttribute(String dbData) {
        return DeliveryStatus.fromString(dbData);
    }
}
