package com.aps.ficcado_crm_backend.mapper;

import com.aps.ficcado_crm_backend.dto.CustomerDto.AddressDto;
import com.aps.ficcado_crm_backend.dto.CustomerDto.CustomerResponse;
import com.aps.ficcado_crm_backend.entity.Customer;
import com.aps.ficcado_crm_backend.entity.CustomerAddress;

import java.util.Collections;
import java.util.List;

public final class CustomerMapper {

    private CustomerMapper() {}

    public static AddressDto toAddressDto(CustomerAddress a) {
        if (a == null) return null;
        return new AddressDto(a.getId(), a.getAddress(), Boolean.TRUE.equals(a.getIsDefault()));
    }

    public static CustomerResponse toResponse(Customer c) {
        if (c == null) return null;
        List<AddressDto> addressDtos = c.getAddresses() != null
                ? c.getAddresses().stream().map(CustomerMapper::toAddressDto).toList()
                : Collections.emptyList();

        return new CustomerResponse(
                c.getId(),
                c.getCustomerName(),
                c.getPhoneNumber(),
                c.getEmailId(),
                c.getTotalOrdersPlaced() != null ? c.getTotalOrdersPlaced() : 0,
                addressDtos
        );
    }
}
