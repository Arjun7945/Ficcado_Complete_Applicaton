package com.aps.ficcado_website_data.controller;

import com.aps.ficcado_website_data.dto.ApiResponse;
import com.aps.ficcado_website_data.dto.DropNotificationRequest;
import com.aps.ficcado_website_data.dto.DropNotificationResponse;
import com.aps.ficcado_website_data.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/drop")
    public ResponseEntity<ApiResponse<DropNotificationResponse>> subscribeDrop(
            @Valid @RequestBody DropNotificationRequest request) {
        DropNotificationResponse response = notificationService.subscribeToDrop(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Successfully subscribed to capsule drop notifications."));
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<ApiResponse<Void>> unsubscribe(
            @RequestParam String email,
            @RequestParam(required = false) String capsuleName) {
        notificationService.unsubscribe(email, capsuleName);
        return ResponseEntity.ok(ApiResponse.success("Successfully unsubscribed from notifications."));
    }
}
