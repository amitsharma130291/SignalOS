"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { updateOutreachDraftEdits } from "@/app/actions/outreach-drafts";
import type { OutreachItem } from "@/lib/outreach-drafts";

type OutreachEditState = {
  status: "idle" | "success" | "error";
  message?: string;
  itemId?: string;
};

const initialState: OutreachEditState = {
  status: "idle",
};

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save Draft Edits"}
    </button>
  );
}

function Field({
  label,
  name,
  value,
  textarea = false,
}: {
  label: string;
  name: string;
  value: string;
  textarea?: boolean;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={value}
          rows={5}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      ) : (
        <input
          name={name}
          defaultValue={value}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      )}
    </label>
  );
}

export function OutreachDraftEditForm({ item }: { item: OutreachItem }) {
  const [state, formAction] = useActionState(updateOutreachDraftEdits, initialState);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const draft = item.draft;

  useEffect(() => {
    if (state.status === "success" && state.itemId === item.id) {
      const timeoutId = window.setTimeout(() => setOpen(false), 0);
      router.refresh();
      return () => window.clearTimeout(timeoutId);
    }
  }, [item.id, router, state]);

  if (!draft) return null;

  return (
    <div className="space-y-2">
      {state.status === "success" && state.itemId === item.id ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Outreach draft saved
        </p>
      ) : null}
      {state.status === "error" && state.itemId === item.id ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {state.message ?? "Could not save outreach draft edits."}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        {open ? "Close draft editor" : "Edit draft copy"}
      </button>
      {open ? (
        <form
          action={formAction}
          className="grid grid-cols-1 gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50 md:grid-cols-2"
        >
          <input type="hidden" name="draftId" value={draft.id} />
          <input type="hidden" name="painSignalId" value={item.id} />
          <Field label="Subject Line" name="subject" value={draft.subject} />
          <Field label="CTA" name="cta" value={draft.cta} />
          <Field label="Hook" name="hook" value={draft.hook} textarea />
          <Field label="Cold Email" name="coldEmail" value={draft.coldEmail} textarea />
          <Field label="LinkedIn Message" name="linkedinMessage" value={draft.linkedinMessage} textarea />
          <Field label="Review Notes" name="notes" value={draft.notes} textarea />
          <div className="md:col-span-2">
            <SaveButton />
          </div>
        </form>
      ) : null}
    </div>
  );
}
