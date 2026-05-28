"use client";

import { useCallback, useState } from "react";
import { ReviewQueueCard } from "@/components/review-queue-card";
import {
  getNextOpenEditId,
  getSavedReviewIdAfterSave,
  shouldShowReviewSavedFeedback,
} from "@/lib/review-edit-form-state";
import { getReviewItemId, type ReviewQueueItem } from "@/lib/review-queue";

export function ReviewQueueList({ items }: { items: ReviewQueueItem[] }) {
  const [savedReviewId, setSavedReviewId] = useState<string | null>(null);
  const [openEditId, setOpenEditId] = useState<string | null>(null);
  const handleSaved = useCallback((savedItemId: string) => {
    setSavedReviewId(getSavedReviewIdAfterSave(savedItemId));
    setOpenEditId(null);
  }, []);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const itemId = getReviewItemId(item);
        const isSaved = shouldShowReviewSavedFeedback(itemId, savedReviewId);
        const isOpen = openEditId === itemId;

        return (
          <ReviewQueueCard
            key={itemId}
            item={item}
            itemId={itemId}
            isOpen={isOpen}
            isSaved={isSaved}
            onToggleEdit={() => setOpenEditId((currentId) => getNextOpenEditId(currentId, itemId))}
            onSaved={handleSaved}
          />
        );
      })}
    </div>
  );
}
