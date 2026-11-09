"use client";

import { useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { countOpenIssues, formatBytes, formatDuration, mediaUrl } from "@/lib/studio/model";
import type { StudioProject, StudioShot } from "@/lib/studio/types";

import { ReviewStatusBadge } from "./status-badges";
import { VideoPreview } from "./video-preview";
import { studioSelectClassName } from "./ui";

interface ComparisonPanelProps {
  readonly project: StudioProject;
  readonly shot: StudioShot;
  readonly selectedTakeId: string | null;
}

function metadataRows(take: StudioShot["takes"][number]) {
  return [
    ["Take", `#${take.takeNumber}`],
    ["Imported", take.createdAt],
    ["Provider", take.provider ?? "—"],
    ["Model", take.model ?? "—"],
    ["Resolution", `${take.width}×${take.height}`],
    ["Duration", formatDuration(take.durationSeconds)],
    ["Frame rate", `${take.frameRate.toFixed(2)} fps`],
    ["Codec", take.codec],
    ["Audio", take.hasAudio ? "present" : "silent"],
    ["File size", formatBytes(take.fileSizeBytes)],
    ["Open issues", String(countOpenIssues(take))],
  ] as const;
}

export function ComparisonPanel({ project, shot, selectedTakeId }: ComparisonPanelProps) {
  const firstId = selectedTakeId ?? shot.takes[0]?.id ?? "";
  const firstDifferent = shot.takes.find((take) => take.id !== firstId)?.id ?? firstId;
  const [aId, setAId] = useState(firstId);
  const [bId, setBId] = useState(firstDifferent);

  if (shot.takes.length < 2) {
    return (
      <EmptyState
        title="A second take is required"
        description="Import another take to compare two versions side by side. Review data and media stay independent."
        phase="Comparison"
      />
    );
  }

  const a = shot.takes.find((take) => take.id === aId) ?? shot.takes[0];
  const b = shot.takes.find((take) => take.id === bId) ?? shot.takes[1];
  if (!a || !b) {
    return <p className="text-xs text-mist-500">Unable to resolve the selected takes.</p>;
  }
  const aMedia = project.media.find((media) => media.id === a.mediaId);
  const bMedia = project.media.find((media) => media.id === b.mediaId);

  return (
    <div data-testid="comparison-panel" className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            className="mb-1.5 block font-mono text-[10px] tracking-[0.12em] text-mist-400 uppercase"
            htmlFor="compare-a"
          >
            Left take
          </label>
          <select
            id="compare-a"
            value={a.id}
            onChange={(event) => setAId(event.currentTarget.value)}
            className={studioSelectClassName}
          >
            {shot.takes.map((take) => (
              <option key={take.id} value={take.id}>
                Take #{take.takeNumber} · {take.provider ?? "unknown provider"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            className="mb-1.5 block font-mono text-[10px] tracking-[0.12em] text-mist-400 uppercase"
            htmlFor="compare-b"
          >
            Right take
          </label>
          <select
            id="compare-b"
            value={b.id}
            onChange={(event) => setBId(event.currentTarget.value)}
            className={studioSelectClassName}
          >
            {shot.takes.map((take) => (
              <option key={take.id} value={take.id}>
                Take #{take.takeNumber} · {take.provider ?? "unknown provider"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-[10px] text-mist-400">
            Left · Take #{a.takeNumber} · <ReviewStatusBadge status={a.reviewStatus} />
          </p>
          {aMedia ? (
            <VideoPreview
              key={a.id}
              src={mediaUrl(project.id, aMedia.id)}
              title={`Comparison take ${a.takeNumber}`}
              testId="comparison-left-video"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[10px] text-mist-400">
            Right · Take #{b.takeNumber} · <ReviewStatusBadge status={b.reviewStatus} />
          </p>
          {bMedia ? (
            <VideoPreview
              key={b.id}
              src={mediaUrl(project.id, bMedia.id)}
              title={`Comparison take ${b.takeNumber}`}
              testId="comparison-right-video"
            />
          ) : null}
        </div>
      </div>

      <p className="rounded-md border border-ink-700 bg-ink-950/50 px-3 py-2 text-xs leading-5 text-mist-500">
        Each player has independent controls. Durations and frame rates may differ; this is manual
        comparison, not frame-accurate synchronization.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-ink-700 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
              <th className="px-2 py-2">Property</th>
              <th className="px-2 py-2">Take #{a.takeNumber}</th>
              <th className="px-2 py-2">Take #{b.takeNumber}</th>
            </tr>
          </thead>
          <tbody>
            {metadataRows(a).map(([label, value], index) => (
              <tr key={label} className="border-b border-ink-800">
                <td className="px-2 py-2 text-mist-500">{label}</td>
                <td className="px-2 py-2 text-mist-200">{value}</td>
                <td className="px-2 py-2 text-mist-200">{metadataRows(b)[index]?.[1] ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
