"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { extractPainAction } from "@/app/actions/pain-signals";

const extractPainInitialState = {
  status: "idle",
} as const;

function ExtractPainSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-fit items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:border-indigo-300 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/70"
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Extracting...
        </>
      ) : (
        "Extract Pain"
      )}
    </button>
  );
}

export function ExtractPainButton({ rawInputId }: { rawInputId: string }) {
  const [state, formAction] = useActionState(extractPainAction, extractPainInitialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="rawInputId" value={rawInputId} />
      <ExtractPainSubmitButton />
      {state.status === "error" && state.message ? (
        <p className="max-w-44 text-xs text-rose-600 dark:text-rose-400">{state.message}</p>
      ) : null}
    </form>
  );
}
