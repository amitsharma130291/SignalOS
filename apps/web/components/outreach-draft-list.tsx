import { OutreachDraftCard } from "@/components/outreach-draft-card";
import type { OutreachItem } from "@/lib/outreach-drafts";

export function OutreachDraftList({ items }: { items: OutreachItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950/70">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No approved or interesting opportunities are ready for outreach drafts yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <OutreachDraftCard key={item.id} item={item} />
      ))}
    </div>
  );
}
