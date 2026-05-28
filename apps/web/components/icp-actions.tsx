"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateICPButton({ painSignalId }: { painSignalId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  async function handleClick() {
    setStatus("loading");

    const response = await fetch("/api/icp/generate", {
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
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:border-violet-300 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-950/70"
      >
        {status === "loading" ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Generating...
          </>
        ) : (
          "Generate ICP"
        )}
      </button>
      {status === "error" ? (
        <p className="max-w-44 text-xs text-rose-600 dark:text-rose-400">
          Could not generate ICP.
        </p>
      ) : null}
    </div>
  );
}
