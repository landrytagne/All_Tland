package com.retrouvit.controller;

import com.retrouvit.service.FileStorageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
@Tag(name = "Fichiers", description = "API d'upload et de gestion de fichiers")
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping("/upload")
    @Operation(summary = "Uploader un fichier image")
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestParam("file") MultipartFile file
    ) {
        String fileUrl = fileStorageService.storeFile(file);

        Map<String, String> response = new HashMap<>();
        response.put("url", fileUrl);
        response.put("filename", file.getOriginalFilename());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/upload/multiple")
    @Operation(summary = "Uploader plusieurs fichiers images")
    public ResponseEntity<Map<String, Object>> uploadMultipleFiles(
            @RequestParam("files") List<MultipartFile> files
    ) {
        List<String> urls = files.stream()
                .map(fileStorageService::storeFile)
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("urls", urls);
        response.put("count", urls.size());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{year}/{month}/{day}/{filename:.+}")
    @Operation(summary = "Servir un fichier image")
    public ResponseEntity<Resource> getFile(
            @PathVariable int year,
            @PathVariable int month,
            @PathVariable int day,
            @PathVariable String filename
    ) {
        String fileUrl = String.format("/api/files/%d/%02d/%02d/%s", year, month, day, filename);
        Path filePath = fileStorageService.getFilePath(fileUrl);

        try {
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists() && resource.isReadable()) {
                String contentType = getContentType(filename);

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (MalformedURLException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping
    @Operation(summary = "Supprimer un fichier")
    public ResponseEntity<Map<String, String>> deleteFile(
            @RequestParam String url
    ) {
        fileStorageService.deleteFile(url);

        Map<String, String> response = new HashMap<>();
        response.put("message", "Fichier supprimé avec succès");

        return ResponseEntity.ok(response);
    }

    private String getContentType(String filename) {
        String ext = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        return switch (ext) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "webp" -> "image/webp";
            default -> "application/octet-stream";
        };
    }
}
