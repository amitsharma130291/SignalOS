"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { updateReviewOverrides } from "@/app/actions/review-queue";
import {
  getReviewEditFeedback,
  shouldCollapseReviewEditForm,
  type ReviewEditActionState,
} from "@/lib/review-edit-form-state";
import type { ReviewQueueItem } from "@/lib/review-queue";

const initialState: ReviewEditActionState = {
  status: "idle",
};

function Field({
  label,
  name,
  value,
  textarea = false,
}: {
  label: string;
  name: string;
  value: string | number | string[];
  textarea?: boolean;
}) {
  const defaultValue = Array.isArray(value) ? value.join(", ") : String(value ?? "");

  return (
    <label className="space-y-1 text-xs">
      <span className="font-medium text-zinc-600 dark:text-zinc-300">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={3}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none focus:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
        />
      )}
    </label>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "Save Human Edits"}
    </button>
  );
}

export function ReviewEditForm({
  item,
  itemId,
  isOpen,
  isSaved,
  onToggleEdit,
  onSaved,
}: {
  item: ReviewQueueItem;
  itemId: string;
  isOpen: boolean;
  isSaved: boolean;
  onToggleEdit: () => void;
  onSaved?: (savedItemId: string) => void;
}) {
  const [state, formAction] = useActionState(updateReviewOverrides, initialState);
  const router = useRouter();
  const feedback = getReviewEditFeedback(state);

  useEffect(() => {
    if (shouldCollapseReviewEditForm(state) && state.itemId === itemId) {
      onSaved?.(state.itemId);
      router.refresh();
    }
  }, [itemId, onSaved, router, state]);

  return (
    <div className="mt-3 space-y-2">
      {isSaved ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          Review saved
        </p>
      ) : feedback && state.status === "error" ? (
        <p
          className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {feedback}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onToggleEdit}
        className="rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400 dark:hover:bg-zinc-900"
      >
        {isOpen ? "Close reviewable fields" : "Edit reviewable fields"}
      </button>
      {isOpen ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="painSignalId" value={itemId} />
          <input type="hidden" name="messageId" value={item.message?.id ?? ""} />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Pain" name="pain" value={item.pain} textarea />
            <Field label="Outreach Angle" name="outreachAngle" value={item.outreachAngle} textarea />
            <Field label="Urgency" name="urgency" value={item.urgency} />
            <Field label="Affected Team" name="affectedTeam" value={item.affectedTeam} />
            <Field
              label="Existing Workaround"
              name="existingWorkaround"
              value={item.existingWorkaround}
            />
            <Field label="Possible ICP" name="possibleIcp" value={item.possibleIcp} />
            <Field
              label="Monetization Score"
              name="monetizationScore"
              value={item.monetizationScore}
            />
            <Field label="Target Titles" name="targetTitles" value={item.targetTitles} />
            <Field label="Company Size" name="companySize" value={item.companySize} />
            <Field label="Industry" name="industry" value={item.industry} />
            <Field label="Buyer" name="buyer" value={item.buyer} />
            <Field label="Budget Owner" name="budgetOwner" value={item.budgetOwner} />
            <Field label="Trigger Event" name="triggerEvent" value={item.triggerEvent} />
            <Field
              label="Refined Outreach Angle"
              name="outreachAngleRefined"
              value={item.outreachAngleRefined}
              textarea
            />
            {item.message ? (
              <>
                <Field label="Message Subject" name="subject" value={item.message.subject} />
                <Field label="Message Body" name="body" value={item.message.body} textarea />
                <Field
                  label="Message Review Notes"
                  name="messageNotes"
                  value={item.message.reviewNotes}
                  textarea
                />
              </>
            ) : null}
            <Field label="Review Notes" name="notes" value={item.humanNotes} textarea />
          </div>
          <SaveButton />
        </form>
        </div>
      ) : null}
    </div>
  );
}
