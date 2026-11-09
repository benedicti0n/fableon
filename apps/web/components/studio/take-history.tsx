"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatDuration } from "@/lib/studio/model";
import type { StudioShot } from "@/lib/studio/types";

import { ReviewStatusBadge } from "./status-badges";
import { studioSecondaryButtonClassName } from "./ui";

interface TakeHistoryProps {
  readonly shot: StudioShot;
  readonly selectedTakeId: string | null;
  readonly onSelect: (takeId: string) => void;
}

export function TakeHistory({ shot, selectedTakeId, onSelect }: TakeHistoryProps) {
  if (shot.takes.length === 0) {
    return (
      <EmptyState
        title="No takes yet"
        description="Import an MP4 to create the first immutable take for this shot."
        phase="Take history"
      />
    );
  }

  return (
    <div data-testid="take-history" className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-ink-700 font-mono text-[9px] tracking-[0.12em] text-mist-500 uppercase">
            <th className="px-2 py-2">Take</th>
            <th className="px-2 py-2">Imported</th>
            <th className="px-2 py-2">Source</th>
            <th className="px-2 py-2">Provider / model</th>
            <th className="px-2 py-2">Media</th>
            <th className="px-2 py-2">Review</th>
            <th className="px-2 py-2 text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {shot.takes.map((take) => {
            const selected = take.id === selectedTakeId;
            return (
              <tr
                key={take.id}
                className={`border-b border-ink-800 align-top ${selected ? "bg-ink-850/70" : ""}`}
              >
                <td className="px-2 py-3 font-mono text-paper-100">#{take.takeNumber}</td>
                <td className="px-2 py-3 text-mist-400">{formatDateTime(take.createdAt)}</td>
                <td className="px-2 py-3 text-mist-300">{take.sourceType}</td>
                <td className="px-2 py-3 text-mist-300">
                  <span className="block text-paper-100">{take.provider ?? "—"}</span>
                  <span className="block font-mono text-[10px] text-mist-500">
                    {take.model ?? "—"}
                  </span>
                </td>
                <td className="px-2 py-3 font-mono text-[10px] text-mist-400">
                  <span className="block">
                    {take.width}×{take.height} · {take.frameRate.toFixed(2)} fps
                  </span>
                  <span className="block">{formatDuration(take.durationSeconds)}</span>
                </td>
                <td className="px-2 py-3">
                  <ReviewStatusBadge status={take.reviewStatus} />
                </td>
                <td className="px-2 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onSelect(take.id)}
                    aria-pressed={selected}
                    className={studioSecondaryButtonClassName}
                  >
                    {selected ? "Selected" : "View take"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
