import { ReviewQueueList } from "@/components/review-queue-list";
import type { ReviewQueueItem } from "@/lib/review-queue";

export function ReviewQueue({ items }: { items: ReviewQueueItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white/80 p-8 text-center dark:border-zinc-700 dark:bg-zinc-950/70">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Nothing needs review right now.
        </p>
      </div>
    );
  }

  return <ReviewQueueList items={items} />;
}
