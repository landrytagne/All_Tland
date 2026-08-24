"use client";

import * as React from "react";
import { Camera, X, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-core";

const API_BASE_URL = "";
const MAX_FILES = 5;
const MAX_SIZE_MB = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ImageUploadProps {
  onUrlsChange: (urls: string[]) => void;
  initialUrls?: string[];
  disabled?: boolean;
}

interface UploadedImage {
  url: string;
  preview: string;
  uploading: boolean;
}

export function ImageUpload({ onUrlsChange, initialUrls = [], disabled = false }: ImageUploadProps) {
  const [images, setImages] = React.useState<UploadedImage[]>(
    initialUrls.map((url) => ({
      url,
      preview: url.startsWith("http") ? url : `${API_BASE_URL}${url}`,
      uploading: false,
    }))
  );
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiRequest<{ url: string; filename: string }>("/api/files/upload", {
        method: "POST",
        body: formData,
      });
      return response.url;
    } catch (err) {
      console.error("Upload failed:", err);
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    // Validate count
    if (images.length + fileArray.length > MAX_FILES) {
      setError(`Maximum ${MAX_FILES} photos autorisées`);
      return;
    }

    setError(null);

    for (const file of fileArray) {
      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Format non autorisé. Utilisez JPG, PNG, GIF ou WebP.");
        continue;
      }

      // Validate size
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setError(`Fichier trop volumineux (max ${MAX_SIZE_MB}MB)`);
        continue;
      }

      // Create preview
      const preview = URL.createObjectURL(file);

      // Add placeholder
      const tempImage: UploadedImage = {
        url: "",
        preview,
        uploading: true,
      };

      setImages((prev) => [...prev, tempImage]);

      // Upload
      const url = await uploadFile(file);

      if (url) {
        setImages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((img) => img.preview === preview && img.uploading);
          if (idx !== -1) {
            updated[idx] = {
              url,
              preview: `${API_BASE_URL}${url}`,
              uploading: false,
            };
          }
          return updated;
        });
      } else {
        // Remove failed upload
        setImages((prev) => prev.filter((img) => img.preview !== preview));
        setError("Échec de l'upload. Veuillez réessayer.");
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const removeImage = async (index: number) => {
    const image = images[index];

    // Delete from server if it was uploaded
    if (image.url) {
      try {
        await apiRequest("/api/files", {
          method: "DELETE",
          body: { url: image.url },
        });
      } catch (err) {
        console.warn("Failed to delete file:", err);
      }
    }

    // Revoke preview URL
    URL.revokeObjectURL(image.preview);

    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Notify parent of URL changes
  React.useEffect(() => {
    const urls = images.filter((img) => !img.uploading && img.url).map((img) => img.url);
    onUrlsChange(urls);
  }, [images, onUrlsChange]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, []);

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragging ? "border-primary bg-primary/5" : "hover:bg-muted/50"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onDragOver={!disabled ? handleDragOver : undefined}
        onDragLeave={!disabled ? handleDragLeave : undefined}
        onDrop={!disabled ? handleDrop : undefined}
        onClick={!disabled ? () => fileInputRef.current?.click() : undefined}
      >
        <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium">
          {isDragging ? "Déposez vos photos ici" : "Ajouter des photos"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Glissez-déposez ou cliquez ({images.length}/{MAX_FILES} photos, max {MAX_SIZE_MB}MB)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <div
              key={image.preview}
              className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
            >
              <img
                src={image.preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Upload overlay */}
              {image.uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              )}

              {/* Delete button */}
              {!image.uploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(index);
                  }}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
