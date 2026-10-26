package com.aps.ficcado_crm_backend.exception;

/**
 * Thrown when the Redis session store is unavailable or fails to respond.
 * Mapped to HTTP 503 SERVICE_UNAVAILABLE with ProblemDetail code SESSION_STORE_UNAVAILABLE.
 */
public class SessionServiceUnavailableException extends RuntimeException {
    public static final String ERROR_CODE = "SESSION_STORE_UNAVAILABLE";

    public SessionServiceUnavailableException(String message) {
        super(message);
    }

    public SessionServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
