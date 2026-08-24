"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, Upload, X, Loader2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  currentAvatar?: string;
  name: string;
  onUpload: (file: File) => Promise<void>;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZE_MAP = {
  sm: "h-16 w-16",
  md: "h-20 w-20",
  lg: "h-28 w-28",
  xl: "h-36 w-36",
};

const ICON_SIZE_MAP = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
  xl: "h-6 w-6",
};

export function AvatarUpload({
  currentAvatar,
  name,
  onUpload,
  size = "lg",
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return;

      // Preview
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      setIsUploading(true);
      setShowMenu(false);
      try {
        await onUpload(file);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 2000);
      } catch (err) {
        console.error("Upload failed:", err);
        setPreview(null);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleClear = useCallback(() => {
    setPreview(null);
    setUploadSuccess(false);
  }, []);

  const displayImage = preview || currentAvatar;

  return (
    <div className="relative group">
      {/* Avatar */}
      <div
        className={cn(
          "relative rounded-full overflow-hidden cursor-pointer",
          SIZE_MAP[size],
          "ring-4 ring-background shadow-lg",
          "transition-all duration-300",
          "group-hover:ring-primary/30",
          isUploading && "opacity-60"
        )}
        onClick={() => !isUploading && setShowMenu(!showMenu)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <Avatar className={cn("h-full w-full", SIZE_MAP[size])}>
          <AvatarImage src={displayImage || undefined} alt={name} className="object-cover" />
          <AvatarFallback className="text-lg bg-primary text-primary-foreground font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
          {isUploading ? (
            <Loader2 className={cn("text-white animate-spin", ICON_SIZE_MAP[size])} />
          ) : uploadSuccess ? (
            <Check className={cn("text-white", ICON_SIZE_MAP[size])} />
          ) : (
            <Camera className={cn("text-white", ICON_SIZE_MAP[size])} />
          )}
        </div>
      </div>

      {/* Clear button for preview */}
      {preview && !isUploading && (
        <button
          className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors animate-scale-in"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
        >
          <X className="h-3 w-3" />
        </button>
      )}

      {/* Popup menu */}
      {showMenu && !isUploading && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 animate-scale-in">
          <div className="bg-popover border rounded-lg shadow-lg p-1 min-w-[160px]">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              onClick={() => {
                fileInputRef.current?.click();
                setShowMenu(false);
              }}
            >
              <Upload className="h-4 w-4" />
              Choisir un fichier
            </button>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
              onClick={() => {
                // Open camera on mobile
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.capture = "user";
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleFile(file);
                };
                input.click();
                setShowMenu(false);
              }}
            >
              <Camera className="h-4 w-4" />
              Prendre une photo
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}
