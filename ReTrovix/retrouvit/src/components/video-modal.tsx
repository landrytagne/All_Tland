"use client";

import * as React from "react";
import { X, Play, Pause, Volume2, VolumeX, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  src: string;
  poster?: string;
  title?: string;
  description?: string;
  /** Current video index (0-based) */
  currentIndex?: number;
  /** Total number of videos */
  totalCount?: number;
  /** Called when user navigates to previous video */
  onPrev?: () => void;
  /** Called when user navigates to next video */
  onNext?: () => void;
}

export function VideoModal({
  open,
  onClose,
  src,
  poster,
  title,
  description,
  currentIndex = 0,
  totalCount = 1,
  onPrev,
  onNext,
}: VideoModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const touchStartX = React.useRef(0);
  const touchStartY = React.useRef(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [progress, setProgress] = React.useState(0);
  const [isReady, setIsReady] = React.useState(false);
  const [swipeOffset, setSwipeOffset] = React.useState(0);
  const [isSwiping, setIsSwiping] = React.useState(false);

  const hasMultiple = totalCount > 1;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < totalCount - 1;

  // Auto-play when modal opens or src changes
  React.useEffect(() => {
    if (!open) return;
    const video = videoRef.current;
    if (!video) return;

    setIsPlaying(false);
    setProgress(0);
    setIsReady(false);
    setSwipeOffset(0);

    video.load();

    const handleCanPlay = () => {
      setIsReady(true);
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    video.addEventListener("canplay", handleCanPlay, { once: true });
    return () => video.removeEventListener("canplay", handleCanPlay);
  }, [open, src]);

  // Keyboard: Escape, Space, ArrowLeft, ArrowRight
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
      if (e.key === "ArrowLeft" && canPrev) onPrev?.();
      if (e.key === "ArrowRight" && canNext) onNext?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose, canPrev, canNext, onPrev, onNext]);

  // Update progress
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video || !open) return;

    const handleTimeUpdate = () => {
      if (video.duration) {
        setProgress((video.currentTime / video.duration) * 100);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
    };
  }, [open]);

  // ─── Touch / Swipe ───────────────────────────────────────────────

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    // Only horizontal swipe (dx > dy) and only in navigable direction
    if (Math.abs(dx) > Math.abs(dy)) {
      // Prevent default scroll behavior for horizontal swipe
      e.preventDefault();

      // Clamp: don't allow swipe past the ends
      if (dx > 0 && !canPrev) {
        setSwipeOffset(dx * 0.2); // rubber-band effect
      } else if (dx < 0 && !canNext) {
        setSwipeOffset(dx * 0.2);
      } else {
        setSwipeOffset(dx);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    const threshold = 60; // minimum swipe distance

    if (swipeOffset > threshold && canPrev) {
      onPrev?.();
    } else if (swipeOffset < -threshold && canNext) {
      onNext?.();
    }

    setSwipeOffset(0);
  };

  // ─── Controls ────────────────────────────────────────────────────

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * video.duration;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
      >
        <X className="h-5 w-5 text-white" />
      </button>

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium">
          {currentIndex + 1} / {totalCount}
        </div>
      )}

      {/* Prev / Next arrows (desktop only) */}
      {hasMultiple && canPrev && (
        <button
          onClick={onPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 hidden sm:flex"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}
      {hasMultiple && canNext && (
        <button
          onClick={onNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all hover:scale-110 hidden sm:flex"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Video container */}
      <div
        className="relative w-full max-w-4xl mx-auto px-4 sm:px-8 flex-shrink-0"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Title */}
        {(title || description) && (
          <div className="mb-3 text-center">
            {title && (
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-white/60 mt-1">{description}</p>
            )}
          </div>
        )}

        {/* Player */}
        <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl">
          <video
            ref={videoRef}
            className="w-full aspect-video"
            poster={poster}
            preload="auto"
            playsInline
            onClick={togglePlay}
          >
            <source src={src} type="video/mp4" />
          </video>

          {/* Loading spinner */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
            </div>
          )}

          {/* Center play/pause button (visible when paused) */}
          {!isPlaying && isReady && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group"
            >
              <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
                <Play className="h-7 w-7 text-forest dark:text-forest-light ml-1" />
              </div>
            </button>
          )}

          {/* Bottom controls bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pt-8 pb-3">
            {/* Progress bar */}
            <div
              className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/progress mb-3"
              onClick={handleSeek}
            >
              <div
                className="absolute inset-y-0 left-0 bg-orange-brand rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-orange-brand opacity-0 group-hover/progress:opacity-100 transition-opacity shadow"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 text-white" />
                  ) : (
                    <Play className="h-4 w-4 text-white ml-0.5" />
                  )}
                </button>
                <button
                  onClick={toggleMute}
                  className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="h-4 w-4 text-white" />
                  ) : (
                    <Volume2 className="h-4 w-4 text-white" />
                  )}
                </button>
              </div>
              <span className="text-xs text-white/60 font-mono">
                RetrouvIt
              </span>
            </div>
          </div>
        </div>

        {/* Dot indicators */}
        {hasMultiple && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {Array.from({ length: totalCount }, (_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (i < currentIndex) onPrev?.();
                  if (i > currentIndex) onNext?.();
                }}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === currentIndex
                    ? "w-8 bg-orange-brand"
                    : "w-2 bg-white/30 hover:bg-white/50"
                )}
                aria-label={`Vidéo ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
