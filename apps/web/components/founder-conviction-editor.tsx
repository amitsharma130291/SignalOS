"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { updateFounderConviction } from "@/app/actions/opportunities";
import type { FounderConvictionResult } from "@/lib/founder-conviction";

const initialState = {
  status: "idle",
} as const;

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

export function FounderConvictionEditor({
  opportunityId,
  founderConviction,
  recommendation,
}: {
  opportunityId: string;
  founderConviction: number | null;
  recommendation: FounderConvictionResult;
}) {
  const [state, formAction] = useActionState(updateFounderConviction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="painSignalId" value={opportunityId} />
      <div className="space-y-2 rounded-xl border border-zinc-200 bg-white/70 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="space-y-1">
          <p className="font-medium text-zinc-700 dark:text-zinc-200">Founder Conviction</p>
          {founderConviction === null ? (
            <p className="text-zinc-600 dark:text-zinc-300">
              Recommended:{" "}
              <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                {recommendation.score.toFixed(1)} / 10
              </span>
            </p>
          ) : (
            <div className="space-y-0.5 text-zinc-600 dark:text-zinc-300">
              <p>
                Human override:{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                  {founderConviction}
                </span>
              </p>
              <p>Recommended: {recommendation.score.toFixed(1)} / 10</p>
            </div>
          )}
          <p className="capitalize text-zinc-600 dark:text-zinc-300">
            Recommendation:{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">
              {recommendation.recommendation}
            </span>
          </p>
        </div>
        {recommendation.reasons.length ? (
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-200">Reasons</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-zinc-600 dark:text-zinc-300">
              {recommendation.reasons.slice(0, 4).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {recommendation.risks.length ? (
          <div>
            <p className="font-medium text-zinc-700 dark:text-zinc-200">Risks</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-zinc-600 dark:text-zinc-300">
              {recommendation.risks.slice(0, 4).map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <label className="block space-y-1 text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">Manual override</span>
        <div className="flex gap-2">
          <input
            name="founderConviction"
            type="number"
            min={1}
            max={10}
            defaultValue={founderConviction ?? ""}
            placeholder="1-10"
            className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-800 outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <SaveButton />
        </div>
      </label>
      {state.status === "error" && state.message ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{state.message}</p>
      ) : null}
      {state.status === "success" ? (
        <p className="text-xs text-emerald-600 dark:text-emerald-400">{state.message}</p>
      ) : null}
    </form>
  );
}
