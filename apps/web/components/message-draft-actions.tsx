"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateDraftButton({
  painSignalId,
  hasDraft,
}: {
  painSignalId: string;
  hasDraft: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");

    const response = await fetch("/api/messages/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ painSignalId }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("idle");
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === "loading"}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/70"
      >
        {status === "loading" ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Generating...
          </>
        ) : hasDraft ? (
          "Regenerate Draft"
        ) : (
          "Generate Draft"
        )}
      </button>
      {status === "error" ? (
        <p className="max-w-44 text-xs text-rose-600 dark:text-rose-400">
          Could not generate draft.
        </p>
      ) : null}
    </div>
  );
}
