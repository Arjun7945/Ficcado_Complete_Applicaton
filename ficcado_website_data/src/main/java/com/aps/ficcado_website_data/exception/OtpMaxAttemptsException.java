package com.aps.ficcado_website_data.exception;

public class OtpMaxAttemptsException extends RuntimeException {
    public OtpMaxAttemptsException(String message) {
        super(message);
    }
}
