"use client";

import { CheckCircle2, RefreshCcw, Server, XCircle } from "lucide-react";
import { useState } from "react";
import { API_BASE_URL, getBackendHealth } from "@/lib/apiClient";

/**
 * Backend status card.
 *
 * This is a temporary POC/dev card.
 * It proves the Next frontend can talk to the separate Node server.
 */
export function BackendStatusCard() {
  const [status, setStatus] = useState<"idle" | "loading" | "online" | "error">(
    "idle"
  );
  const [message, setMessage] = useState("Backend not checked yet.");

  const checkBackend = async () => {
    try {
      setStatus("loading");
      setMessage("Checking backend connection...");

      const result = await getBackendHealth();

      setStatus("online");
      setMessage(
        `${result.data.service} is online · ${new Date(
          result.meta.timestamp
        ).toLocaleTimeString()}`
      );
    } catch (error) {
      setStatus("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "Backend connection failed."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-cyan-300" />
          <h2 className="font-bold text-white">Backend Status</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Frontend → Node server connection test
        </p>
      </div>

      <div
        className={`rounded-xl border p-3 ${
          status === "online"
            ? "border-emerald-400/30 bg-emerald-400/10"
            : status === "error"
              ? "border-red-400/30 bg-red-400/10"
              : "border-white/10 bg-black/20"
        }`}
      >
        <div className="flex items-start gap-3">
          {status === "online" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
          ) : status === "error" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
          ) : (
            <Server className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {status === "online"
                ? "Connected"
                : status === "error"
                  ? "Connection failed"
                  : status === "loading"
                    ? "Checking..."
                    : "Not checked"}
            </p>

            <p className="mt-1 break-words text-xs leading-5 text-slate-400">
              {message}
            </p>

            <p className="mt-2 break-all text-[11px] leading-5 text-slate-500">
              {API_BASE_URL}
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={checkBackend}
        disabled={status === "loading"}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
      >
        <RefreshCcw className="h-4 w-4" />
        {status === "loading" ? "Checking..." : "Check Backend"}
      </button>
    </section>
  );
}
