"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { runFilterAction, runFilterOnAllNewAction } from "@/app/actions/raw-inputs";

const filterActionInitialState = {
  status: "idle",
} as const;

function FilterSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-fit items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-800"
    >
      {pending ? (
        <>
          <span className="spinner" aria-hidden="true" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </button>
  );
}

export function RunFilterButton({ rawInputId }: { rawInputId: string }) {
  const [state, formAction] = useActionState(runFilterAction, filterActionInitialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction}>
      <input type="hidden" name="rawInputId" value={rawInputId} />
      <FilterSubmitButton idleLabel="Run filter" pendingLabel="Filtering..." />
    </form>
  );
}

export function RunFilterOnAllNewButton() {
  const [state, formAction] = useActionState(runFilterOnAllNewAction, filterActionInitialState);
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="space-y-2">
      <FilterSubmitButton idleLabel="Run Filter on All New" pendingLabel="Filtering all..." />
      {state.message ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{state.message}</p>
      ) : null}
    </form>
  );
}
