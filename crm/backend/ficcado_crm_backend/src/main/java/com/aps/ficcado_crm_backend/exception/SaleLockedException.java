package com.aps.ficcado_crm_backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class SaleLockedException extends RuntimeException {
    public SaleLockedException(String message) {
        super(message);
    }
}
