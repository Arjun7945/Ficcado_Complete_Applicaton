package com.aps.ficcado_website_data.service;

import com.aps.ficcado_website_data.dto.DropNotificationRequest;
import com.aps.ficcado_website_data.dto.DropNotificationResponse;
import com.aps.ficcado_website_data.entity.DropNotification;
import com.aps.ficcado_website_data.entity.enums.NotificationStatus;
import com.aps.ficcado_website_data.repository.DropNotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private DropNotificationRepository notificationRepository;

    @InjectMocks
    private NotificationService notificationService;

    @Test
    void testSubscribeToDrop_NewSubscription() {
        DropNotificationRequest request = DropNotificationRequest.builder()
                .email("streetwear@ficcado.in")
                .capsuleName("chosen")
                .interestCategory("t-shirts")
                .build();

        when(notificationRepository.findByEmailAndCapsuleName("streetwear@ficcado.in", "chosen"))
                .thenReturn(Optional.empty());

        ArgumentCaptor<DropNotification> captor = ArgumentCaptor.forClass(DropNotification.class);
        when(notificationRepository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));

        DropNotificationResponse response = notificationService.subscribeToDrop(request);

        assertNotNull(response);
        assertEquals("streetwear@ficcado.in", response.getEmail());
        assertEquals("chosen", response.getCapsuleName());
        assertEquals(NotificationStatus.ACTIVE, response.getStatus());

        verify(notificationRepository, times(1)).save(any());
    }

    @Test
    void testUnsubscribe_Success() {
        DropNotification existing = DropNotification.builder()
                .email("streetwear@ficcado.in")
                .capsuleName("chosen")
                .status(NotificationStatus.ACTIVE)
                .build();

        when(notificationRepository.findByEmailAndCapsuleName("streetwear@ficcado.in", "chosen"))
                .thenReturn(Optional.of(existing));

        notificationService.unsubscribe("streetwear@ficcado.in", "chosen");

        assertEquals(NotificationStatus.UNSUBSCRIBED, existing.getStatus());
        verify(notificationRepository, times(1)).save(existing);
    }
}
