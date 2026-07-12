"use client";

import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { listLeads, type LeadListItem } from "@/lib/apiClient";

const ADMIN_SESSION_KEY = "pools3d-admin-password";

/**
 * LeadsDashboard displays recent customer inquiries.
 *
 * Current MVP protection:
 * - admin enters password
 * - password is sent to backend using x-admin-password
 * - backend protects GET /api/leads
 *
 * Future production option:
 * - replace with proper auth provider
 */
export function LeadsDashboard() {
  const [leads, setLeads] = useState<LeadListItem[]>([]);
  const [adminPassword, setAdminPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );

  const [message, setMessage] = useState("Enter admin password to view leads.");

  const stats = useMemo(() => {
    const withPhone = leads.filter((lead) => lead.phone).length;
    const withEmail = leads.filter((lead) => lead.email).length;
    const withCity = leads.filter((lead) => lead.city).length;

    return {
      total: leads.length,
      withPhone,
      withEmail,
      withCity,
    };
  }, [leads]);

  useEffect(() => {
    const savedPassword = sessionStorage.getItem(ADMIN_SESSION_KEY);

    if (savedPassword) {
      setAdminPassword(savedPassword);
      setPasswordInput(savedPassword);
      setIsUnlocked(true);
      loadLeads(savedPassword);
    }
  }, []);

  const loadLeads = async (passwordOverride?: string) => {
    const passwordToUse = passwordOverride ?? adminPassword;

    if (!passwordToUse) {
      setStatus("error");
      setMessage("Admin password is required.");
      return;
    }

    try {
      setStatus("loading");
      setMessage("Loading leads...");

      const result = await listLeads(passwordToUse);

      setLeads(result.data);
      setStatus("success");
      setMessage(
        result.data.length > 0
          ? `${result.data.length} lead(s) loaded.`
          : "No leads found yet."
      );
    } catch (error) {
      setLeads([]);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not load leads.");
    }
  };

  const handleLogin = async () => {
    const trimmedPassword = passwordInput.trim();

    if (!trimmedPassword) {
      setStatus("error");
      setMessage("Admin password is required.");
      return;
    }

    sessionStorage.setItem(ADMIN_SESSION_KEY, trimmedPassword);
    setAdminPassword(trimmedPassword);
    setIsUnlocked(true);

    await loadLeads(trimmedPassword);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setAdminPassword("");
    setPasswordInput("");
    setIsUnlocked(false);
    setLeads([]);
    setStatus("idle");
    setMessage("Enter admin password to view leads.");
  };

  if (!isUnlocked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-4 py-8">
          <Link
            href="/studio"
            className="mb-6 inline-flex w-fit items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Studio
          </Link>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30">
            <div className="mb-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-cyan-300/10 p-3">
                  <LockKeyhole className="h-6 w-6 text-cyan-300" />
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">
                    Admin Area
                  </p>
                  <h1 className="mt-1 text-2xl font-black">
                    Dashboard Login
                  </h1>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-400">
                Enter admin password to view customer leads and quote requests.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleLogin();
                  }
                }}
                placeholder="Admin password"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/60"
              />

              <button
                type="button"
                onClick={handleLogin}
                disabled={status === "loading"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
              >
                {status === "loading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                {status === "loading" ? "Checking..." : "Unlock Dashboard"}
              </button>
            </div>

            {status === "error" ? (
              <div className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                  <p className="text-sm leading-6 text-red-100">{message}</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/studio"
              className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Studio
            </Link>

            <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
              Pools 3D Admin
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Leads Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Recent customer quote requests submitted from the pool
              configurator.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => loadLeads()}
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-400"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {status === "loading" ? "Refreshing..." : "Refresh Leads"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.08]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </header>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Total Leads" value={stats.total} />
          <StatCard label="With Phone" value={stats.withPhone} />
          <StatCard label="With Email" value={stats.withEmail} />
          <StatCard label="With City" value={stats.withCity} />
        </section>

        <section
          className={`mb-6 rounded-2xl border p-4 ${
            status === "error"
              ? "border-red-400/30 bg-red-400/10"
              : "border-white/10 bg-white/[0.04]"
          }`}
        >
          <div className="flex items-start gap-3">
            {status === "loading" ? (
              <Loader2 className="mt-0.5 h-5 w-5 animate-spin text-cyan-300" />
            ) : status === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
            ) : (
              <UserRound className="mt-0.5 h-5 w-5 text-emerald-300" />
            )}

            <div>
              <p className="font-bold">
                {status === "loading"
                  ? "Loading"
                  : status === "error"
                    ? "Could not load leads"
                    : "Leads loaded"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-400">{message}</p>
            </div>
          </div>
        </section>

        {leads.length > 0 ? (
          <section className="grid gap-4">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </section>
        ) : status === "success" ? (
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-500" />
            <h2 className="mt-4 text-xl font-black">No leads yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              Submit a Request Quote form from the studio to see leads here.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </article>
  );
}

function LeadCard({ lead }: { lead: LeadListItem }) {
  const dimensions = lead.config.dimensions;
  const materials = lead.config.materials;

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">{lead.customerName}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Lead ID: {lead.id.slice(0, 8)}... ·{" "}
                {new Date(lead.createdAt).toLocaleString()}
              </p>
            </div>

            <span className="w-fit rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">
              {lead.source}
            </span>
          </div>

          <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
            <ContactRow
              icon={<Phone className="h-4 w-4" />}
              label="Phone"
              value={lead.phone ?? "Not provided"}
            />
            <ContactRow
              icon={<Mail className="h-4 w-4" />}
              label="Email"
              value={lead.email ?? "Not provided"}
            />
            <ContactRow
              icon={<MapPin className="h-4 w-4" />}
              label="City"
              value={lead.city ?? "Not provided"}
            />
          </div>

          {lead.message ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                Message
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {lead.message}
              </p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Pool Design
          </p>

          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <p>
              <span className="font-bold text-white">Size:</span>{" "}
              {dimensions.length.toFixed(1)}m × {dimensions.width.toFixed(1)}m ×{" "}
              {dimensions.depth.toFixed(1)}m
            </p>
            <p>
              <span className="font-bold text-white">Pool Tile:</span>{" "}
              {materials.poolTile}
            </p>
            <p>
              <span className="font-bold text-white">Water:</span>{" "}
              {materials.water}
            </p>
            <p>
              <span className="font-bold text-white">Deck:</span>{" "}
              {materials.deck}
            </p>
            <p>
              <span className="font-bold text-white">Coping:</span>{" "}
              {materials.coping}
            </p>
          </div>

          {lead.designId ? (
            <Link
              href={`/studio/design/${lead.designId}`}
              target="_blank"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-200"
            >
              <ExternalLink className="h-4 w-4" />
              Open Saved Design
            </Link>
          ) : (
            <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-5 text-slate-500">
              This lead includes design config, but it is not attached to a saved
              design ID yet.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="mt-0.5 text-cyan-300">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          {label}
        </p>
        <p className="mt-1 break-words text-sm text-slate-300">{value}</p>
      </div>
    </div>
  );
}
