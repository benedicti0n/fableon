"use client";

import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import { formatDuration } from "@/lib/studio/model";

import { studioSecondaryButtonClassName } from "./ui";

interface VideoPreviewProps {
  readonly src: string;
  readonly title: string;
  readonly testId?: string;
  readonly className?: string;
  readonly poster?: string;
}

export function VideoPreview({ src, title, testId, className, poster }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePlay(): void {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch((playError: unknown) => {
        setError(playError instanceof Error ? playError.message : "Playback failed.");
      });
    } else {
      video.pause();
    }
  }

  function seek(value: number): void {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = value;
    setCurrentTime(value);
  }

  function toggleMute(): void {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  async function enterFullscreen(): Promise<void> {
    const container = containerRef.current;
    if (!container?.requestFullscreen) {
      setError("Fullscreen is not supported by this browser.");
      return;
    }
    try {
      await container.requestFullscreen();
    } catch {
      setError("Fullscreen was blocked by the browser.");
    }
  }

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className={cn("overflow-hidden rounded-lg border border-ink-700 bg-black", className)}
    >
      <video
        ref={videoRef}
        data-testid={testId ? `${testId}-video` : undefined}
        src={src}
        poster={poster}
        aria-label={title}
        className="aspect-video w-full bg-black object-contain"
        playsInline
        preload="metadata"
        muted={muted}
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration;
          setDuration(Number.isFinite(value) ? value : 0);
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setError("The browser could not load this video file.")}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-700 bg-ink-900 px-3 py-2">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? "Pause video" : "Play video"}
          className={studioSecondaryButtonClassName}
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={duration > 0 ? duration : 0}
          step={0.01}
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => seek(Number(event.currentTarget.value))}
          aria-label={`${title} position`}
          className="min-w-32 flex-1 accent-ochre-400"
          disabled={duration <= 0}
        />
        <span className="font-mono text-[10px] text-mist-300" aria-label="Video time">
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </span>
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className={studioSecondaryButtonClassName}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          type="button"
          onClick={() => void enterFullscreen()}
          aria-label="Enter fullscreen"
          className={studioSecondaryButtonClassName}
        >
          Fullscreen
        </button>
      </div>

      {error ? (
        <p
          role="alert"
          className="border-t border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
