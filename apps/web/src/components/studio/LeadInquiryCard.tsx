"use client";

import { CheckCircle2, Send, UserRound, XCircle } from "lucide-react";
import { useState } from "react";
import { createLead, type LeadResponse } from "@/lib/apiClient";
import { usePoolStore } from "@/store/usePoolStore";

/**
 * LeadInquiryCard captures a customer inquiry for the current pool design.
 *
 * Important Step 25 behavior:
 * - If a saved design is active, inquiry is attached to that saved design ID.
 * - If user changes dimensions/materials after saving, activeDesignId becomes null.
 */
export function LeadInquiryCard() {
  const dimensions = usePoolStore((state) => state.dimensions);
  const materials = usePoolStore((state) => state.materials);
  const activeDesignId = usePoolStore((state) => state.activeDesignId);

  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [messageText, setMessageText] = useState("");

  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const [message, setMessage] = useState(
    "Send a quote request for the current pool design."
  );

  const [lead, setLead] = useState<LeadResponse | null>(null);

  const canSubmit =
    customerName.trim().length > 0 &&
    (phone.trim().length > 0 || email.trim().length > 0) &&
    status !== "loading";

  const handleSubmitLead = async () => {
    try {
      setStatus("loading");
      setLead(null);
      setMessage("Sending inquiry to backend...");

      const result = await createLead({
        customerName,
        phone,
        email,
        city,
        message: messageText,

        /**
         * This is the main Step 25 field.
         * If activeDesignId exists, backend will save it on Lead.designId.
         */
        designId: activeDesignId ?? undefined,

        config: {
          version: 1,
          shape: "rectangular",
          dimensions,
          materials,
          source: "studio",
        },

        source: activeDesignId ? "shared-design" : "studio",
      });

      setStatus("success");
      setLead(result.data);
      setMessage(
        result.data.designId
          ? "Inquiry submitted and attached to saved design."
          : "Inquiry submitted with design config only."
      );

      setCustomerName("");
      setPhone("");
      setEmail("");
      setCity("");
      setMessageText("");
    } catch (error) {
      setStatus("error");
      setLead(null);
      setMessage(
        error instanceof Error ? error.message : "Could not submit inquiry."
      );
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <UserRound className="h-4 w-4 text-amber-300" />
          <h2 className="font-bold text-white">Request Quote</h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          Send inquiry for current pool design
        </p>
      </div>

      <div className="space-y-3">
        <input
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Customer name *"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60"
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Phone"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60"
          />

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60"
          />
        </div>

        <input
          value={city}
          onChange={(event) => setCity(event.target.value)}
          placeholder="City"
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60"
        />

        <textarea
          value={messageText}
          onChange={(event) => setMessageText(event.target.value)}
          placeholder="Message / notes"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-300/60"
        />
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
        {activeDesignId ? (
          <p>
            <span className="font-bold text-white">Attached saved design:</span>{" "}
            {activeDesignId.slice(0, 8)}...
          </p>
        ) : (
          <p>
            This inquiry will include the current design config, but it is not
            attached to a saved design yet.
          </p>
        )}
      </div>

      <div
        className={`mt-4 rounded-xl border p-3 ${
          status === "success"
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
          ) : (
            <Send className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          )}

          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">
              {status === "success"
                ? "Inquiry submitted"
                : status === "error"
                  ? "Inquiry failed"
                  : status === "loading"
                    ? "Sending..."
                    : "Ready"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">{message}</p>

            {lead ? (
              <div className="mt-3 rounded-xl bg-black/20 p-3 text-xs leading-5 text-slate-300">
                <p>
                  <span className="font-bold text-white">Lead ID:</span>{" "}
                  {lead.id.slice(0, 8)}...
                </p>

                <p>
                  <span className="font-bold text-white">Customer:</span>{" "}
                  {lead.customerName}
                </p>

                <p>
                  <span className="font-bold text-white">Design ID:</span>{" "}
                  {lead.designId ? `${lead.designId.slice(0, 8)}...` : "None"}
                </p>

                <p>
                  <span className="font-bold text-white">Created:</span>{" "}
                  {new Date(lead.createdAt).toLocaleString()}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmitLead}
        disabled={!canSubmit}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        <Send className="h-4 w-4" />
        {status === "loading" ? "Sending..." : "Send Inquiry"}
      </button>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        Name is required. Phone or email is required.
      </p>
    </section>
  );
}
