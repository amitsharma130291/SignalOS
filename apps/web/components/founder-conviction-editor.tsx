"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { updateFounderConviction } from "@/app/actions/opportunities";

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
}: {
  opportunityId: string;
  founderConviction: number | null;
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
      <label className="block space-y-1 text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">Founder Conviction</span>
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
