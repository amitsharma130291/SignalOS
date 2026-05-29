import Link from "next/link";
import { OpportunityDashboard } from "@/components/opportunity-dashboard";
import { getOpportunityMetrics, shapeOpportunity } from "@/lib/opportunity-dashboard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200/70 bg-white/90 p-4 shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-colors hover:border-indigo-200 dark:border-zinc-800/80 dark:bg-zinc-950/85 dark:ring-white/5 dark:hover:border-indigo-500/30">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function isMissingColumnError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2022"
  );
}

async function getPainSignalsForDashboard() {
  const baseSelect = {
    id: true,
    pain: true,
    urgency: true,
    affectedTeam: true,
    existingWorkaround: true,
    possibleIcp: true,
    monetizationScore: true,
    outreachAngle: true,
    frequency: true,
    currentSolution: true,
    solutionGap: true,
    founderConviction: true,
    b2bScore: true,
    status: true,
    targetTitles: true,
    companySize: true,
    industry: true,
    buyer: true,
    budgetOwner: true,
    triggerEvent: true,
    outreachAngleRefined: true,
    icpGeneratedAt: true,
    rawInput: {
      select: {
        rawText: true,
        status: true,
        metadata: true,
      },
    },
  } as const;
  const reviewSelect = {
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
  } as const;

  try {
    return await prisma.painSignal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        ...baseSelect,
        ...reviewSelect,
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
        _count: {
          select: {
            interviews: true,
          },
        },
      },
    });
  } catch (error) {
    if (!isMissingColumnError(error)) {
      throw error;
    }

    return prisma.painSignal.findMany({
      orderBy: { createdAt: "desc" },
      select: baseSelect,
    });
  }
}

export default async function OpportunitiesPage() {
  const painSignals = await getPainSignalsForDashboard();
  const opportunities = painSignals.map(shapeOpportunity);
  const metrics = getOpportunityMetrics(opportunities);

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.10),transparent_32rem),radial-gradient(circle_at_top_right,rgba(168,85,247,0.08),transparent_28rem)]" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Day 7 · Opportunity Dashboard
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
                  Opportunity Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  Review structured opportunities from raw signals, pain extraction, and ICP
                  generation. Human approval stays required before any outbound work.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex w-fit rounded-xl border border-zinc-300 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-950/90 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Back to Signals
              </Link>
              <Link
                href="/review"
                className="inline-flex w-fit rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >
                Review Queue
              </Link>
              <Link
                href="/outreach"
                className="inline-flex w-fit rounded-xl border border-indigo-200 bg-indigo-50/90 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-950"
              >
                Outreach Drafts
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricCard label="Total" value={metrics.total} />
          <MetricCard label="Accepted" value={metrics.acceptedSignals} />
          <MetricCard label="Needs Review" value={metrics.needsReview} />
          <MetricCard label="High Urgency" value={metrics.highUrgency} />
          <MetricCard label="ICP Generated" value={metrics.icpGenerated} />
        </section>

        <OpportunityDashboard opportunities={opportunities} />
      </main>
    </div>
  );
}
