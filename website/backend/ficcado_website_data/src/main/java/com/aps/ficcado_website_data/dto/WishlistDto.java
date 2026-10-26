package com.aps.ficcado_website_data.dto;

import java.time.Instant;

public class WishlistDto {

    public record WishlistItemResponse(
            Long itemId,
            Instant createdAt
    ) {}
}
