import {
  generateOutreachDraftAction,
  updateOutreachDraftStatus,
} from "@/app/actions/outreach-drafts";
import { OutreachDraftEditForm } from "@/components/outreach-draft-edit-form";
import type { OutreachItem } from "@/lib/outreach-drafts";
import {
  shouldShowGenerateOutreachDraftButton,
  shouldShowHumanEditedBadge,
  shouldShowRegenerateOutreachDraftButton,
} from "@/lib/outreach-ui-state";

function StatusAction({
  draftId,
  status,
  label,
}: {
  draftId: string;
  status: "reviewed" | "approved_for_outreach" | "bad_messaging";
  label: string;
}) {
  return (
    <form action={updateOutreachDraftStatus}>
      <input type="hidden" name="draftId" value={draftId} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {label}
      </button>
    </form>
  );
}

function GenerateDraftForm({
  painSignalId,
  regenerate = false,
}: {
  painSignalId: string;
  regenerate?: boolean;
}) {
  return (
    <form action={generateOutreachDraftAction}>
      <input type="hidden" name="painSignalId" value={painSignalId} />
      <input type="hidden" name="regenerate" value={String(regenerate)} />
      <button
        type="submit"
        className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        {regenerate ? "Regenerate Draft" : "Generate Outreach Draft"}
      </button>
    </form>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
        {value}
      </p>
    </div>
  );
}

export function OutreachDraftCard({ item }: { item: OutreachItem }) {
  const hasDraft = Boolean(item.draft);
  const canGenerate = shouldShowGenerateOutreachDraftButton(item.painSignal.status, hasDraft);
  const canRegenerate = shouldShowRegenerateOutreachDraftButton(item.painSignal.status, hasDraft);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {item.painSignal.status.replaceAll("_", " ")}
            </span>
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
              {item.affectedTeam}
            </span>
            {item.draft ? (
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {item.draft.status.replaceAll("_", " ")}
              </span>
            ) : null}
            {item.draft && shouldShowHumanEditedBadge(item.draft.hasHumanEdits) ? (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-semibold text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
                Human edited
              </span>
            ) : null}
          </div>
          <h2 className="text-lg font-semibold leading-snug text-zinc-950 dark:text-zinc-50">
            {item.pain}
          </h2>
          <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            ICP: {item.targetTitles.join(", ") || item.buyer} · Urgency: {item.urgency} · Monetization:{" "}
            {item.monetizationScore}
          </p>
          <p className="rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900/70 dark:text-zinc-300">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">Strategy:</span>{" "}
            {item.outreachAngleRefined !== "Unknown" ? item.outreachAngleRefined : item.outreachAngle}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:w-64">
          {canGenerate ? <GenerateDraftForm painSignalId={item.id} /> : null}
          {canRegenerate ? <GenerateDraftForm painSignalId={item.id} regenerate /> : null}
          {item.draft ? (
            <>
              <StatusAction draftId={item.draft.id} status="reviewed" label="Mark Reviewed" />
              <StatusAction
                draftId={item.draft.id}
                status="approved_for_outreach"
                label="Approve Messaging"
              />
              <StatusAction draftId={item.draft.id} status="bad_messaging" label="Bad Messaging" />
            </>
          ) : null}
        </div>
      </div>

      {item.draft ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <CopyBlock label="Subject" value={item.draft.subject} />
            <CopyBlock label="CTA" value={item.draft.cta} />
            <CopyBlock label="Cold Email" value={item.draft.coldEmail} />
            <CopyBlock label="LinkedIn Message" value={item.draft.linkedinMessage} />
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <CopyBlock label="Consultative Variant" value={item.draft.generated.variants.consultative} />
            <CopyBlock label="Direct Variant" value={item.draft.generated.variants.direct} />
            <CopyBlock label="Executive Variant" value={item.draft.generated.variants.executive} />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="font-semibold text-zinc-700 dark:text-zinc-200">
              Quality score: {item.draft.qualityScore}/100
            </p>
            {item.draft.qualityWarnings.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-300">
                {item.draft.qualityWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-zinc-500 dark:text-zinc-400">No quality warnings.</p>
            )}
          </div>

          <OutreachDraftEditForm item={item} />
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          No outreach draft yet. Generate one only after the opportunity is approved or marked
          interesting.
        </p>
      )}
    </article>
  );
}
