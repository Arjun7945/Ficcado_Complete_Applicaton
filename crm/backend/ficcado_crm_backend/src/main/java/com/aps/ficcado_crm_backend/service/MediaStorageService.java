package com.aps.ficcado_crm_backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import jakarta.annotation.PostConstruct;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.util.Base64;
import java.util.UUID;
import javax.imageio.ImageIO;

/**
 * Generic Media Storage Service backed by Cloudflare R2 (S3-compatible API).
 *
 * Context-parameterized: callers pass a "context" string (e.g. "items/{itemId}")
 * to namespace uploads, making this service reusable for future use cases
 * (e.g. "posts/{postId}" if a photo-feed feature is added later).
 *
 * Key paths:
 *   Full-resolution: {context}/full/{uuid}.webp
 *   Thumbnail:       {context}/thumb/{uuid}.webp
 *
 * Both keys are returned to the caller so they can store the URLs in item_images.
 *
 * Validation enforced here:
 *   - File type: JPEG, PNG, WebP only
 *   - Max file size: 10 MB per image
 *   - Thumbnail generation: creates a 300×300 thumbnail (preserving aspect ratio)
 *     using Java's ImageIO — R2 does not auto-thumbnail.
 *
 * Configuration via environment variables (no hardcoded credentials):
 *   R2_ACCOUNT_ID        — Cloudflare account ID
 *   R2_ACCESS_KEY_ID     — R2 Access Key ID
 *   R2_SECRET_ACCESS_KEY — R2 Secret Access Key
 *   R2_BUCKET_NAME       — R2 bucket name
 *   R2_PUBLIC_URL        — Public base URL for the R2 bucket (e.g. https://cdn.ficcado.com)
 */
@Slf4j
@Service
public class MediaStorageService {

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
    private static final int THUMBNAIL_SIZE = 300; // pixels (max dimension)
    private static final int MAX_IMAGES_PER_ITEM = 10;

    @Value("${r2.account-id:}")
    private String accountId;

    @Value("${r2.access-key-id:}")
    private String accessKeyId;

    @Value("${r2.secret-access-key:}")
    private String secretAccessKey;

    @Value("${r2.bucket-name:ficcado-media}")
    private String bucketName;

    @Value("${r2.public-url:https://media.ficcado.store}")
    private String publicUrl;

    private S3Client s3Client;

    @PostConstruct
    public void init() {
        if (accessKeyId.isBlank() || secretAccessKey.isBlank() || accountId.isBlank()) {
            log.warn("Cloudflare R2 credentials not configured " +
                     "(R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ACCOUNT_ID). " +
                     "Item image upload will be unavailable until credentials are set.");
            return;
        }
        String r2Endpoint = String.format("https://%s.r2.cloudflarestorage.com", accountId);
        this.s3Client = S3Client.builder()
                .endpointOverride(URI.create(r2Endpoint))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
                .region(Region.of("auto"))   // R2 uses "auto" as the region
                .build();
        log.info("Cloudflare R2 MediaStorageService initialized — bucket: {}", bucketName);
    }

    /**
     * Upload an image file, generating both full-resolution and thumbnail versions.
     *
     * @param file    the uploaded file from a multipart request
     * @param context namespace prefix (e.g. "items/42")
     * @return UploadResult with the public URLs for both full and thumbnail images
     */
    public UploadResult uploadImage(MultipartFile file, String context) throws IOException {
        validateFile(file);

        if (s3Client == null) {
            log.info("R2 s3Client is null — generating Base64 Data URL for local dev storage");
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            String mime = file.getContentType() != null ? file.getContentType() : "image/webp";
            String dataUrl = "data:" + mime + ";base64," + base64;
            return new UploadResult(dataUrl, dataUrl);
        }


        String uuid = UUID.randomUUID().toString();
        String fullKey  = context + "/full/"  + uuid + ".webp";
        String thumbKey = context + "/thumb/" + uuid + ".webp";

        byte[] originalBytes = file.getBytes();
        byte[] fullBytes  = processToWebP(originalBytes, 0);   // 0 = no resize, just convert
        byte[] thumbBytes = processToWebP(originalBytes, THUMBNAIL_SIZE);

        uploadToR2(fullKey,  fullBytes,  "image/webp");
        uploadToR2(thumbKey, thumbBytes, "image/webp");

        String fullUrl  = publicUrl + "/" + fullKey;
        String thumbUrl = publicUrl + "/" + thumbKey;

        log.info("Uploaded image: full={}, thumb={}", fullUrl, thumbUrl);
        return new UploadResult(fullUrl, thumbUrl);
    }

    /**
     * Delete both the full-resolution and thumbnail files from R2.
     * Called when an admin deletes a specific image from an item.
     *
     * @param imageUrl     the full-resolution URL stored in item_images.image_url
     * @param thumbnailUrl the thumbnail URL stored in item_images.thumbnail_url
     */
    public void deleteImage(String imageUrl, String thumbnailUrl) {
        if (s3Client == null) {
            log.warn("R2 not configured — skipping R2 deletion for: {}", imageUrl);
            return;
        }
        deleteFromR2(extractKey(imageUrl));
        deleteFromR2(extractKey(thumbnailUrl));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File is empty or missing.");
        }
        String contentType = file.getContentType();
        if (contentType == null ||
            (!contentType.equals("image/jpeg") &&
             !contentType.equals("image/png")  &&
             !contentType.equals("image/webp"))) {
            throw new IllegalArgumentException(
                "Unsupported file type: " + contentType + ". Allowed: JPEG, PNG, WebP.");
        }
        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new IllegalArgumentException(
                "File size exceeds 10 MB limit. Actual: " + (file.getSize() / 1024 / 1024) + " MB.");
        }
    }

    /**
     * Convert image bytes to WebP format, optionally resizing to fit within maxDimension.
     * maxDimension = 0 means no resize (just convert to WebP for format consistency).
     *
     * Uses Java ImageIO with the WebP writer from the TwelveMonkeys library (if present),
     * falling back to storing the original bytes if WebP encoding is unavailable.
     */
    private byte[] processToWebP(byte[] inputBytes, int maxDimension) throws IOException {
        try {
            ByteArrayInputStream bis = new ByteArrayInputStream(inputBytes);
            BufferedImage original = ImageIO.read(bis);

            if (original == null) {
                throw new IOException("Cannot decode image — unsupported or corrupt file.");
            }

            BufferedImage target;
            if (maxDimension > 0 &&
                (original.getWidth() > maxDimension || original.getHeight() > maxDimension)) {
                // Scale down preserving aspect ratio
                double scale = Math.min(
                    (double) maxDimension / original.getWidth(),
                    (double) maxDimension / original.getHeight()
                );
                int newW = (int) (original.getWidth()  * scale);
                int newH = (int) (original.getHeight() * scale);
                BufferedImage scaled =
                    new BufferedImage(newW, newH, BufferedImage.TYPE_INT_RGB);
                Graphics2D g = scaled.createGraphics();
                g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                                   RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                g.drawImage(original, 0, 0, newW, newH, null);
                g.dispose();
                target = scaled;
            } else {
                target = original;
            }

            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            // Try WebP first; fall back to JPEG if WebP writer is not available
            boolean wrote = ImageIO.write(target, "webp", bos);
            if (!wrote) {
                bos.reset();
                ImageIO.write(target, "jpeg", bos);
            }
            return bos.toByteArray();

        } catch (IOException e) {
            log.warn("Image processing failed — storing original bytes. Error: {}", e.getMessage(), e);
            return inputBytes;
        }
    }

    private void uploadToR2(String key, byte[] bytes, String contentType) {
        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength((long) bytes.length)
                .build();
        s3Client.putObject(req, RequestBody.fromBytes(bytes));
    }

    private void deleteFromR2(String key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(key)
                    .build());
            log.info("Deleted from R2: {}", key);
        } catch (SdkException e) {
            log.error("Failed to delete R2 object {}: {}", key, e.getMessage(), e);
        }
    }

    /** Extract the R2 object key from a full public URL. */
    private String extractKey(String url) {
        if (url == null) return "";
        return url.startsWith(publicUrl + "/")
               ? url.substring(publicUrl.length() + 1)
               : url;
    }

    /** Result of a successful upload — public URLs for full and thumbnail images. */
    public record UploadResult(String imageUrl, String thumbnailUrl) {}
}
