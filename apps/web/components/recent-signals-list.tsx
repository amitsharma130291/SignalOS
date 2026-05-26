type RecentSignal = {
  id: string;
  inputType: string;
  sourceName: string | null;
  rawText: string;
  createdAt: Date;
};

function getPreview(text: string, maxLength = 140) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatInputType(type: string) {
  return type.replaceAll("_", " ");
}

export function RecentSignalsList({ signals }: { signals: RecentSignal[] }) {
  if (signals.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-dashed border-zinc-300/80 bg-white/50 p-8 text-center dark:border-zinc-700/80 dark:bg-zinc-900/30">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No signals saved yet
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Paste your first pain signal above to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {signals.map((signal, index) => (
        <li
          key={signal.id}
          className="group animate-fade-up rounded-2xl border border-zinc-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:hover:border-indigo-500/30"
          style={{ animationDelay: `${index * 60}ms` }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium capitalize text-indigo-700 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:group-hover:bg-indigo-950">
              {formatInputType(signal.inputType)}
            </span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {signal.sourceName ?? "No source"}
            </span>
            <span className="text-zinc-400 dark:text-zinc-500">
              {new Date(signal.createdAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {getPreview(signal.rawText)}
          </p>
        </li>
      ))}
    </ul>
  );
}
