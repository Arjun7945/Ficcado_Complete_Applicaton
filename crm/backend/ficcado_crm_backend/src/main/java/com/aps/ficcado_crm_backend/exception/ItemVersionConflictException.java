package com.aps.ficcado_crm_backend.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@Getter
@ResponseStatus(HttpStatus.CONFLICT)
public class ItemVersionConflictException extends RuntimeException {

    public static final String ERROR_CODE = "ITEM_VERSION_CONFLICT";
    public static final String DEFAULT_MESSAGE = "This item was changed by another admin. Reload to see the latest version.";

    private final Long expectedVersion;
    private final Long actualVersion;

    public ItemVersionConflictException() {
        this(null, null, DEFAULT_MESSAGE);
    }

    public ItemVersionConflictException(Long expectedVersion, Long actualVersion) {
        this(expectedVersion, actualVersion, DEFAULT_MESSAGE);
    }

    public ItemVersionConflictException(Long expectedVersion, Long actualVersion, String message) {
        super(message);
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }

    public ItemVersionConflictException(String message) {
        this(null, null, message);
    }
}

