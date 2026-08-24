"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Smartphone,
  Briefcase,
  Key,
  PawPrint,
  Car,
  Shirt,
  Gem,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const categoryIcons: Record<string, React.ElementType> = {
  Documents: FileText,
  "Électronique": Smartphone,
  "Sacs & Bagages": Briefcase,
  Clés: Key,
  Animaux: PawPrint,
  Véhicules: Car,
  Vêtements: Shirt,
  Bijoux: Gem,
  Autres: Package,
};

const API_BASE = "";

function getImageUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE}${url}`;
}

function parseImages(image?: string, images?: string): string[] {
  const all: string[] = [];
  if (image) all.push(image);
  if (images) {
    images.split(",").forEach((u) => {
      const trimmed = u.trim();
      if (trimmed && !all.includes(trimmed)) all.push(trimmed);
    });
  }
  return all;
}

interface ImageGalleryProps {
  image?: string;
  images?: string;
  title: string;
  category: string;
  type: "lost" | "found";
}

export function ImageGallery({ image, images, title, category, type }: ImageGalleryProps) {
  const allImages = parseImages(image, images);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [zoomed, setZoomed] = React.useState(false);

  const CategoryIcon = categoryIcons[category] || Package;
  const hasImages = allImages.length > 0;

  const goTo = React.useCallback(
    (dir: number) => {
      setSelectedIndex((prev) => {
        const next = prev + dir;
        if (next < 0) return allImages.length - 1;
        if (next >= allImages.length) return 0;
        return next;
      });
      setZoomed(false);
    },
    [allImages.length]
  );

  // Keyboard navigation in lightbox
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowLeft") goTo(-1);
      if (e.key === "ArrowRight") goTo(1);
      if (e.key === " ") { e.preventDefault(); setZoomed((z) => !z); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, goTo]);

  // No images placeholder
  if (!hasImages) {
    return (
      <div className="aspect-[16/10] rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className={cn(
            "inline-flex h-20 w-20 items-center justify-center rounded-2xl mb-3",
            type === "lost" ? "bg-orange-brand/10" : "bg-forest/10"
          )}>
            <CategoryIcon className={cn(
              "h-10 w-10",
              type === "lost" ? "text-orange-brand/50" : "text-forest/50"
            )} />
          </div>
          <p className="text-sm text-muted-foreground/60 font-medium">Photo de l&apos;objet</p>
          <p className="text-xs text-muted-foreground/40 mt-1">Aucune image disponible</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Main Gallery ── */}
      <div className="space-y-3 animate-fade-in">
        {/* Main image */}
        <div
          className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-muted cursor-pointer group"
          onClick={() => setLightboxOpen(true)}
        >
          <img
            src={getImageUrl(allImages[selectedIndex])}
            alt={`${title} - ${selectedIndex + 1}/${allImages.length}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Expand button */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/50 backdrop-blur-sm text-white">
              <Maximize2 className="h-4 w-4" />
            </div>
          </div>

          {/* Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-3 right-3 flex h-7 items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2.5 text-xs text-white font-medium">
              <span>{selectedIndex + 1}</span>
              <span className="text-white/60">/</span>
              <span>{allImages.length}</span>
            </div>
          )}

          {/* Navigation arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(-1); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(1); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-black/60"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Type badge */}
          <div className={cn(
            "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold text-white shadow-lg",
            type === "lost" ? "bg-orange-brand" : "bg-forest"
          )}>
            {type === "lost" ? "🔍 Perdu" : "✅ Trouvé"}
          </div>
        </div>

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {allImages.map((url, idx) => (
              <button
                key={idx}
                onClick={() => { setSelectedIndex(idx); setZoomed(false); }}
                className={cn(
                  "relative flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 transition-all",
                  idx === selectedIndex
                    ? "border-forest ring-2 ring-forest/20 scale-105"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-muted-foreground/30"
                )}
              >
                <img
                  src={getImageUrl(url)}
                  alt={`Miniature ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                {idx === selectedIndex && (
                  <div className="absolute inset-0 bg-forest/10" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Lightbox Modal ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Zoom toggle */}
          <button
            className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z); }}
          >
            {zoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
          </button>

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getImageUrl(allImages[selectedIndex])}
              alt={`${title} - ${selectedIndex + 1}/${allImages.length}`}
              className={cn(
                "max-w-full max-h-[85vh] object-contain rounded-lg transition-transform duration-300",
                zoomed ? "scale-150 cursor-grab" : ""
              )}
            />
          </div>

          {/* Navigation */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(-1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goTo(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Counter */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {/* Dots */}
            <div className="flex gap-1.5">
              {allImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); setZoomed(false); }}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    idx === selectedIndex
                      ? "w-6 bg-white"
                      : "w-2 bg-white/40 hover:bg-white/60"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
