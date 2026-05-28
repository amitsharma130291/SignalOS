import Link from "next/link";
import { OutreachDraftList } from "@/components/outreach-draft-list";
import { prisma } from "@/lib/prisma";
import { shapeOutreachItem } from "@/lib/outreach-drafts";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const painSignals = await prisma.painSignal.findMany({
    where: {
      OR: [
        { status: { in: ["approved", "interesting"] } },
        { outreachDraft: { isNot: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      status: true,
      pain: true,
      urgency: true,
      affectedTeam: true,
      existingWorkaround: true,
      possibleIcp: true,
      monetizationScore: true,
      outreachAngle: true,
      targetTitles: true,
      companySize: true,
      industry: true,
      buyer: true,
      budgetOwner: true,
      triggerEvent: true,
      outreachAngleRefined: true,
      humanPain: true,
      humanUrgency: true,
      humanAffectedTeam: true,
      humanExistingWorkaround: true,
      humanPossibleIcp: true,
      humanMonetizationScore: true,
      humanOutreachAngle: true,
      humanTargetTitles: true,
      humanCompanySize: true,
      humanIndustry: true,
      humanBuyer: true,
      humanBudgetOwner: true,
      humanTriggerEvent: true,
      humanOutreachAngleRefined: true,
      outreachDraft: {
        select: {
          id: true,
          generatedDraft: true,
          qualityScore: true,
          qualityWarnings: true,
          status: true,
          humanSubject: true,
          humanColdEmail: true,
          humanLinkedinMessage: true,
          humanCta: true,
          humanHook: true,
          humanNotes: true,
          humanEditedAt: true,
          reviewedAt: true,
          generatedAt: true,
        },
      },
    },
  });
  const items = painSignals.map(shapeOutreachItem);

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_32rem)]" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:py-14">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Day 10 · Draft Outreach Generation
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Outreach Drafts
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Generate deterministic email and LinkedIn draft copy for approved opportunities.
              This is review-only: no sending, sequencing, or automation exists.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/opportunities"
              className="inline-flex w-fit rounded-xl border border-zinc-300 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Opportunities
            </Link>
            <Link
              href="/review"
              className="inline-flex w-fit rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-950"
            >
              Review Queue
            </Link>
          </div>
        </section>

        <OutreachDraftList items={items} />
      </main>
    </div>
  );
}
