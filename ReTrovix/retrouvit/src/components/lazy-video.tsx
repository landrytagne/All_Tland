"use client";

import * as React from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  overlayClassName?: string;
  onPlay?: () => void;
}

/**
 * Lazy-loaded video that:
 * 1. Does NOT set a <source> until the card is in the viewport (IntersectionObserver)
 * 2. Does NOT fetch the video file until the user hovers (mouseEnter)
 * 3. Pauses and resets when the user leaves
 */
export function LazyVideo({
  src,
  poster,
  className,
  overlayClassName,
  onPlay,
}: LazyVideoProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);

  // 1. IntersectionObserver: only mark as visible when in viewport
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" } // start loading a bit before it scrolls into view
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 2. Set the <source> src only once visible
  React.useEffect(() => {
    if (!isVisible || isLoaded) return;
    const video = videoRef.current;
    if (!video) return;

    // Set the source programmatically so it doesn't fetch until ready
    const source = document.createElement("source");
    source.src = src;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load();
    setIsLoaded(true);
  }, [isVisible, isLoaded, src]);

  // 3. Play on hover, pause on leave
  const handleMouseEnter = () => {
    const video = videoRef.current;
    if (!video || !isLoaded) return;
    video.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleMouseLeave = () => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    setIsPlaying(false);
  };

  // 4. Click to open modal
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Pause the thumbnail preview first
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
    }
    onPlay?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-forest/10 to-orange-brand/10 dark:from-forest-light/10 dark:to-orange-brand/10",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      {/* Poster image shows instantly while video loads lazily */}
      {poster && !isPlaying && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          loading="lazy"
          decoding="async"
        />
      )}

      {/* Video element — source is only added when visible + hovered */}
      <video
        ref={videoRef}
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-transform duration-500",
          "group-hover:scale-105",
          isPlaying ? "opacity-100" : "opacity-0"
        )}
        poster={poster}
        preload="none"
        muted
        loop
        playsInline
      />

      {/* Play / Pause indicator */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-black/20 transition-colors",
          isPlaying ? "bg-black/10" : "bg-black/20",
          overlayClassName
        )}
      >
        <div
          className={cn(
            "h-14 w-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg transition-all duration-300",
            isPlaying
              ? "scale-90 opacity-0"
              : "scale-100 opacity-100 group-hover:scale-110"
          )}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 text-forest dark:text-forest-light" />
          ) : (
            <Play className="h-6 w-6 text-forest dark:text-forest-light ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
}
