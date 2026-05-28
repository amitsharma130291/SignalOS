import Link from "next/link";
import { ReviewQueue } from "@/components/review-queue";
import { prisma } from "@/lib/prisma";
import { shapeReviewQueueItem } from "@/lib/review-queue";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const painSignals = await prisma.painSignal.findMany({
    where: {
      OR: [
        { status: { in: ["new", "interesting", "bad_angle"] } },
        { messages: { some: { status: { in: ["draft", "bad_angle"] } } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      pain: true,
      urgency: true,
      affectedTeam: true,
      existingWorkaround: true,
      possibleIcp: true,
      monetizationScore: true,
      outreachAngle: true,
      b2bScore: true,
      status: true,
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
      humanNotes: true,
      angleFeedback: true,
      reviewedAt: true,
      messages: {
        orderBy: { generatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          subject: true,
          body: true,
          status: true,
          humanSubject: true,
          humanBody: true,
          reviewNotes: true,
          reviewedAt: true,
          generatedAt: true,
        },
      },
    },
  });
  const items = painSignals.map(shapeReviewQueueItem);

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_32rem)]" />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6 lg:py-14">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Day 9 · Human Review Queue
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Human Review Queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Approve, reject, edit, or flag bad angles before anything can move forward.
              Sending remains unavailable.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/opportunities"
              className="inline-flex w-fit rounded-xl border border-zinc-300 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Back to Opportunities
            </Link>
          </div>
        </section>

        <ReviewQueue items={items} />
      </main>
    </div>
  );
}
