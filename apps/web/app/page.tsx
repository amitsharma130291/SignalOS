import { ManualSignalForm } from "@/components/manual-signal-form";
import { RecentSignalsList } from "@/components/recent-signals-list";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const recentSignals = await prisma.rawInput.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      inputType: true,
      sourceName: true,
      rawText: true,
      createdAt: true,
    },
  });

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 animate-shimmer" />
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl dark:bg-indigo-500/10" />
      <div className="pointer-events-none absolute -right-24 top-32 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl dark:bg-violet-500/10" />

      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6 lg:py-14">
        <section className="animate-fade-up space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/70 bg-indigo-50/80 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse-soft" />
            Day 3 · Manual input
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
            SignalOS
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Capture raw pain signals manually, save them to your database, and
            review recent entries below.
          </p>
        </section>

        <ManualSignalForm />

        <section className="animate-fade-up space-y-4" style={{ animationDelay: "160ms" }}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Recent signals
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Latest {recentSignals.length} saved entries
              </p>
            </div>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {recentSignals.length}
            </span>
          </div>

          <RecentSignalsList signals={recentSignals} />
        </section>
      </main>
    </div>
  );
}
