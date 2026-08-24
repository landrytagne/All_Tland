package com.retrouvit.service;

import com.retrouvit.exception.ResourceNotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageService {

    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    @Value("${upload.max-size:10485760}")  // 10MB default
    private long maxFileSize;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp",
            "wav", "mp3", "ogg", "webm", "m4a",
            "pdf"
    );

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp",
            "audio/wav", "audio/mpeg", "audio/ogg", "audio/webm", "audio/mp4", "audio/x-m4a",
            "application/pdf"
    );

    /**
     * Store a file and return the relative URL to access it.
     */
    public String storeFile(MultipartFile file) {
        validateFile(file);

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String extension = getExtension(originalFilename);
        String uniqueFilename = generateUniqueFilename(extension);

        // Create date-based subdirectory: uploads/2026/08/20/
        String datePath = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        Path targetDirectory = Paths.get(uploadDir).resolve(datePath);

        try {
            Files.createDirectories(targetDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Impossible de créer le répertoire de stockage", e);
        }

        Path targetLocation = targetDirectory.resolve(uniqueFilename);

        try {
            InputStream inputStream = file.getInputStream();
            Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Échec du stockage du fichier: " + originalFilename, e);
        }

        // Return relative URL
        String relativeUrl = "/api/files/" + datePath + "/" + uniqueFilename;
        log.info("File stored: {} -> {}", originalFilename, relativeUrl);
        return relativeUrl;
    }

    /**
     * Delete a file by its relative URL path.
     */
    public void deleteFile(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return;

        // Extract path from URL: /api/files/2026/08/20/xxx.jpg -> 2026/08/20/xxx.jpg
        String relativePath = fileUrl.replace("/api/files/", "");
        Path filePath = Paths.get(uploadDir).resolve(relativePath);

        try {
            if (Files.exists(filePath)) {
                Files.delete(filePath);
                log.info("File deleted: {}", fileUrl);
            }
        } catch (IOException e) {
            log.error("Failed to delete file: {}", fileUrl, e);
        }
    }

    /**
     * Get the absolute path for a file URL (for serving).
     */
    public Path getFilePath(String fileUrl) {
        String relativePath = fileUrl.replace("/api/files/", "");
        return Paths.get(uploadDir).resolve(relativePath);
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Le fichier est vide");
        }

        if (file.getSize() > maxFileSize) {
            throw new RuntimeException("Le fichier dépasse la taille maximale de " + (maxFileSize / 1024 / 1024) + "MB");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new RuntimeException("Type de fichier non autorisé: " + contentType);
        }

        String extension = getExtension(file.getOriginalFilename());
        if (!ALLOWED_EXTENSIONS.contains(extension.toLowerCase())) {
            throw new RuntimeException("Extension non autorisée: " + extension);
        }
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private String generateUniqueFilename(String extension) {
        return UUID.randomUUID().toString() + "." + extension;
    }
}
