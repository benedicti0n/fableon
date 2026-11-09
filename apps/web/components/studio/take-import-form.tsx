"use client";

import { useState } from "react";

import { studioUpload, StudioApiError } from "@/lib/studio/client";
import type {
  RenderingMethod,
  StudioProject,
  StudioTake,
  TakeSourceType,
} from "@/lib/studio/types";

import {
  studioLabelClassName,
  studioPrimaryButtonClassName,
  studioSelectClassName,
  studioInputClassName,
  studioTextareaClassName,
} from "./ui";

interface TakeImportFormProps {
  readonly projectId: string;
  readonly shotId: string;
  readonly shotPrompt: string;
  readonly renderingMethod: RenderingMethod;
  readonly onImported: (project: StudioProject, take: StudioTake) => void;
}

const SOURCE_LABELS: Record<TakeSourceType, string> = {
  "ai-video": "AI video",
  "deterministic-export": "Deterministic export",
  "imported-video": "Imported video",
};

export function TakeImportForm({
  projectId,
  shotId,
  shotPrompt,
  renderingMethod,
  onImported,
}: TakeImportFormProps) {
  const defaultSource: TakeSourceType =
    renderingMethod === "ai-video" ? "ai-video" : "deterministic-export";
  const [sourceType, setSourceType] = useState<TakeSourceType>(defaultSource);
  const [provider, setProvider] = useState(renderingMethod === "ai-video" ? "Google" : "Fableon");
  const [model, setModel] = useState(
    renderingMethod === "ai-video" ? "gemini-omni-1.2-flash" : "Canvas 2D / Phase 2.7 Gate 2",
  );
  const [prompt, setPrompt] = useState(shotPrompt);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    form.set("sourceType", sourceType);
    form.set("provider", provider);
    form.set("model", model);
    form.set("prompt", prompt);
    setIsImporting(true);
    setError(null);
    try {
      const response = await studioUpload<{
        project: StudioProject;
        take: StudioTake;
      }>(`/api/studio/projects/${projectId}/shots/${shotId}/takes`, form);
      onImported(response.project, response.take);
      formElement.reset();
      setSourceType(defaultSource);
      setPrompt(shotPrompt);
    } catch (importError) {
      setError(
        importError instanceof StudioApiError
          ? importError.message
          : "The video could not be imported.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <form
      data-testid="take-import-form"
      onSubmit={(event) => void submit(event)}
      className="space-y-3"
    >
      <div>
        <label className={studioLabelClassName} htmlFor="take-video-file">
          MP4 video
        </label>
        <input
          id="take-video-file"
          name="file"
          type="file"
          accept="video/mp4"
          required
          className={studioInputClassName}
        />
        <p className="mt-1.5 text-[11px] leading-5 text-mist-500">
          The original file is copied into local storage and never modified. Metadata is read with
          FFprobe at import time.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={studioLabelClassName} htmlFor="take-source-type">
            Source type
          </label>
          <select
            id="take-source-type"
            value={sourceType}
            onChange={(event) => setSourceType(event.currentTarget.value as TakeSourceType)}
            className={studioSelectClassName}
          >
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={studioLabelClassName} htmlFor="take-provider">
            Provider
          </label>
          <input
            id="take-provider"
            value={provider}
            onChange={(event) => setProvider(event.currentTarget.value)}
            className={studioInputClassName}
            placeholder="Provider name"
          />
        </div>
      </div>

      <div>
        <label className={studioLabelClassName} htmlFor="take-model">
          Model
        </label>
        <input
          id="take-model"
          value={model}
          onChange={(event) => setModel(event.currentTarget.value)}
          className={studioInputClassName}
          placeholder="Model name"
        />
      </div>

      <div>
        <label className={studioLabelClassName} htmlFor="take-prompt">
          Generation prompt
        </label>
        <textarea
          id="take-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.currentTarget.value)}
          className={studioTextareaClassName}
          placeholder="What generated this take?"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-clay-500/40 bg-clay-500/10 px-3 py-2 text-xs text-clay-500"
        >
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={isImporting} className={studioPrimaryButtonClassName}>
        {isImporting ? "Importing and inspecting…" : "Import as new take"}
      </button>
    </form>
  );
}
