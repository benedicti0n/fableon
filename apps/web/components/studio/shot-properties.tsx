"use client";

/* eslint-disable @next/next/no-img-element -- local media is served through a constrained API route. */

import { useState } from "react";

import { studioPatchJson, studioUpload, StudioApiError } from "@/lib/studio/client";
import { mediaUrl } from "@/lib/studio/model";
import type {
  RenderingMethod,
  StudioMediaAsset,
  StudioProject,
  StudioShot,
} from "@/lib/studio/types";

import {
  studioInputClassName,
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioReadonlyClassName,
  studioSecondaryButtonClassName,
  studioSelectClassName,
  studioTextareaClassName,
} from "./ui";

interface ShotPropertiesProps {
  readonly projectId: string;
  readonly shot: StudioShot;
  readonly media: readonly StudioMediaAsset[];
  readonly onUpdated: (project: StudioProject) => void;
}

export function ShotProperties({ projectId, shot, media, onUpdated }: ShotPropertiesProps) {
  const [title, setTitle] = useState(shot.title);
  const [description, setDescription] = useState(shot.description);
  const [targetDuration, setTargetDuration] = useState(String(shot.targetDurationSeconds));
  const [prompt, setPrompt] = useState(shot.generationPrompt);
  const [method, setMethod] = useState<RenderingMethod>(shot.renderingMethod);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reference = media.find((item) => item.id === shot.referenceImageMediaId) ?? null;

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setError(null);
    try {
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${projectId}/shots/${shot.id}`,
        {
          title,
          description,
          targetDurationSeconds: Number(targetDuration),
          generationPrompt: prompt,
          renderingMethod: method,
        },
      );
      onUpdated(response.project);
      setMessage("Shot properties saved.");
    } catch (saveError) {
      setError(
        saveError instanceof StudioApiError
          ? saveError.message
          : "The shot properties could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadReference(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("reference");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a PNG, JPEG, or WebP starting frame first.");
      return;
    }
    setIsUploading(true);
    setMessage(null);
    setError(null);
    try {
      const upload = await studioUpload<{ media: StudioMediaAsset }>(
        `/api/studio/projects/${projectId}/media`,
        form,
      );
      const response = await studioPatchJson<{ project: StudioProject }>(
        `/api/studio/projects/${projectId}/shots/${shot.id}`,
        { referenceImageMediaId: upload.media.id },
      );
      onUpdated(response.project);
      formElement.reset();
      setMessage("Starting frame attached.");
    } catch (uploadError) {
      setError(
        uploadError instanceof StudioApiError
          ? uploadError.message
          : "The starting frame could not be uploaded.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div data-testid="shot-properties" className="space-y-6">
      <form onSubmit={(event) => void save(event)} className="space-y-3">
        <div>
          <label className={studioLabelClassName} htmlFor="shot-title">
            Shot title
          </label>
          <input
            id="shot-title"
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            className={studioInputClassName}
            required
          />
        </div>
        <div>
          <label className={studioLabelClassName} htmlFor="shot-description">
            Description
          </label>
          <textarea
            id="shot-description"
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            className={studioTextareaClassName}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={studioLabelClassName} htmlFor="shot-duration">
              Target duration (seconds)
            </label>
            <input
              id="shot-duration"
              type="number"
              min={0.1}
              max={120}
              step={0.1}
              value={targetDuration}
              onChange={(event) => setTargetDuration(event.currentTarget.value)}
              className={studioInputClassName}
            />
          </div>
          <div>
            <label className={studioLabelClassName} htmlFor="shot-method">
              Rendering method
            </label>
            <select
              id="shot-method"
              value={method}
              onChange={(event) => setMethod(event.currentTarget.value as RenderingMethod)}
              className={studioSelectClassName}
            >
              <option value="ai-video">AI video</option>
              <option value="deterministic">Deterministic</option>
            </select>
          </div>
        </div>
        <div>
          <label className={studioLabelClassName} htmlFor="shot-prompt">
            Generation prompt
          </label>
          <textarea
            id="shot-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.currentTarget.value)}
            className={studioTextareaClassName}
          />
        </div>
        <button type="submit" disabled={isSaving} className={studioPrimaryButtonClassName}>
          {isSaving ? "Saving…" : "Save shot properties"}
        </button>
      </form>

      <div className="border-t border-ink-700 pt-5">
        <h3 className="font-mono text-[10px] tracking-[0.14em] text-mist-400 uppercase">
          Starting frame
        </h3>
        {reference ? (
          <div className="mt-3 space-y-2">
            <img
              src={mediaUrl(projectId, reference.id)}
              alt="Shot starting frame"
              className="aspect-video w-full rounded-md border border-ink-700 object-cover"
            />
            <p className="font-mono text-[10px] text-mist-500">
              {reference.originalName} · {reference.width}×{reference.height}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-xs leading-5 text-mist-500">
            No starting frame attached. Upload a PNG, JPEG, or WebP reference for regeneration
            planning.
          </p>
        )}
        <form onSubmit={(event) => void uploadReference(event)} className="mt-3 space-y-2">
          <input
            name="reference"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label="Starting frame file"
            className={studioInputClassName}
          />
          <button type="submit" disabled={isUploading} className={studioSecondaryButtonClassName}>
            {isUploading ? "Uploading…" : "Attach starting frame"}
          </button>
        </form>
      </div>

      <dl className="space-y-2 border-t border-ink-700 pt-5">
        <div>
          <dt className={studioLabelClassName}>Shot ID</dt>
          <dd className={studioReadonlyClassName}>{shot.id}</dd>
        </div>
        <div>
          <dt className={studioLabelClassName}>Created</dt>
          <dd className={studioReadonlyClassName}>{shot.createdAt}</dd>
        </div>
        <div>
          <dt className={studioLabelClassName}>Updated</dt>
          <dd className={studioReadonlyClassName}>{shot.updatedAt}</dd>
        </div>
      </dl>

      {message ? (
        <p
          role="status"
          className="rounded-md border border-sage-500/40 bg-sage-500/10 px-3 py-2 text-xs text-sage-400"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
