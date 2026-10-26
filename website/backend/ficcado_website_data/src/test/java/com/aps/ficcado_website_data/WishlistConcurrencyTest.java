package com.aps.ficcado_website_data;

import com.aps.ficcado_website_data.entity.WishlistItem;
import com.aps.ficcado_website_data.repository.WishlistRepository;
import com.aps.ficcado_website_data.service.WishlistService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class WishlistConcurrencyTest {

    @Autowired
    private WishlistService wishlistService;

    @Autowired
    private WishlistRepository wishlistRepository;

    @AfterEach
    void tearDown() {
        wishlistRepository.deleteAll();
    }

    @Test
    @DisplayName("Concurrent duplicate adds produce exactly one row in the database")
    void concurrentDuplicateAdds_produceOneRow() throws Exception {
        Long customerId = 555L;
        Long itemId = 42L;

        int threadCount = 30;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<Future<?>> futures = new ArrayList<>();

        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    wishlistService.addToWishlist(customerId, itemId);
                } catch (Exception e) {
                    // unexpected exception
                    throw new RuntimeException(e);
                } finally {
                    doneLatch.countDown();
                }
            }));
        }

        // Fire all threads simultaneously
        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();

        for (Future<?> f : futures) {
            f.get(); // ensure no unexpected exceptions
        }

        List<WishlistItem> items = wishlistRepository.findAll();
        assertThat(items).hasSize(1);
        assertThat(items.get(0).getCustomerId()).isEqualTo(customerId);
        assertThat(items.get(0).getItemId()).isEqualTo(itemId);
    }

    @Test
    @DisplayName("Concurrent adds across distinct customers remain strictly isolated")
    void concurrentAdds_distinctCustomersIsolated() throws Exception {
        int customerCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(customerCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(customerCount);

        for (int i = 1; i <= customerCount; i++) {
            final long custId = 1000L + i;
            final long itmId = (long) i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    wishlistService.addToWishlist(custId, itmId);
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        boolean completed = doneLatch.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).isTrue();

        for (int i = 1; i <= customerCount; i++) {
            long custId = 1000L + i;
            var list = wishlistService.getWishlist(custId);
            assertThat(list).hasSize(1);
            assertThat(list.get(0).itemId()).isEqualTo((long) i);
        }
    }
}
