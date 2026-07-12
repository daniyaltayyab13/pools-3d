"use client";

import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FolderOpen,
  Loader2,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import {
  getSavedDesign,
  listSavedDesigns,
  type SavedDesignListItem,
} from "@/lib/apiClient";
import { usePoolStore } from "@/store/usePoolStore";

/**
 * SavedDesignsApiCard lists saved designs from Postgres
 * and loads a selected design back into the studio state.
 *
 * This is the second MVP database-backed feature.
 */
export function SavedDesignsApiCard() {
  const setDesignConfig = usePoolStore((state) => state.setDesignConfig);

  const [designs, setDesigns] = useState<SavedDesignListItem[]>([]);
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [loadingDesignId, setLoadingDesignId] = useState<string | null>(null);
  const [message, setMessage] = useState("Saved designs have not been loaded.");

  const handleLoadList = async () => {
    try {
      setStatus("loading");
      setMessage("Loading saved designs from database...");

      const result = await listSavedDesigns();

      setDesigns(result.data);
      setStatus("success");
      setMessage(
        result.data.length > 0
          ? `${result.data.length} saved design(s) loaded.`
          : "No saved designs found yet."
      );
    } catch (error) {
      setStatus("error");
      setDesigns([]);
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load saved designs."
      );
    }
  };

  const handleLoadDesign = async (designId: string) => {
    try {
      setLoadingDesignId(designId);
      setMessage("Loading selected design into studio...");

      const result = await getSavedDesign(designId);

      setDesignConfig({
        dimensions: result.data.config.dimensions,
        materials: result.data.config.materials,
        activeDesignId: result.data.id,
      });

      setStatus("success");
      setMessage("Saved design loaded into studio.");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Could not load design."
      );
    } finally {
      setLoadingDesignId(null);
    }
  };

  const handleCopyShareLink = async (designId: string) => {
    const shareUrl = `${window.location.origin}/studio/design/${designId}`;

    await navigator.clipboard.writeText(shareUrl);
    setStatus("success");
    setMessage("Share link copied to clipboard.");
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-emerald-300" />
          <h2 className="font-bold text-white">Saved Designs</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Load previously saved pool configs
        </p>
      </div>

      <div
        className={`rounded-xl border p-3 ${status === "success"
            ? "border-emerald-400/30 bg-emerald-400/10"
            : status === "error"
              ? "border-red-400/30 bg-red-400/10"
              : "border-white/10 bg-black/20"
          }`}
      >
        <div className="flex items-start gap-3">
          {status === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : status === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          ) : status === "loading" ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-slate-400" />
          ) : (
            <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {status === "success"
                ? "Loaded"
                : status === "error"
                  ? "Failed"
                  : status === "loading"
                    ? "Loading..."
                    : "Not loaded"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">{message}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleLoadList}
        disabled={status === "loading"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
      >
        {status === "loading" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCcw className="h-4 w-4" />
        )}
        {status === "loading" ? "Loading..." : "Load Saved Designs"}
      </button>

      {designs.length > 0 ? (
        <div className="mt-4 space-y-3">
          {designs.map((design) => (
            <article
              key={design.id}
              className="rounded-xl border border-white/10 bg-black/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">
                    {design.name ?? "Untitled Pool"}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {design.length.toFixed(1)}m × {design.width.toFixed(1)}m ×{" "}
                    {design.depth.toFixed(1)}m
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {design.poolTile} · {design.water}
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Saved {new Date(design.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadDesign(design.id)}
                    disabled={loadingDesignId === design.id}
                    className="rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-slate-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    {loadingDesignId === design.id ? "Loading..." : "Load"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(design.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>

                  <a
                    href={`/studio/design/${design.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white transition hover:bg-white/[0.08]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
