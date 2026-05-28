export type ReviewEditActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  itemId?: string;
};

export function shouldCollapseReviewEditForm(state: ReviewEditActionState) {
  return state.status === "success";
}

export function getReviewEditFeedback(state: ReviewEditActionState) {
  if (state.status === "error") return state.message ?? "Could not save review edits.";
  return null;
}

export function getNextOpenEditId(currentOpenEditId: string | null, itemId: string) {
  return currentOpenEditId === itemId ? null : itemId;
}

export function getSavedReviewIdAfterSave(savedItemId: string) {
  return savedItemId;
}

export function shouldShowReviewSavedFeedback(itemId: string, savedReviewId: string | null) {
  return savedReviewId === itemId;
}

export function getReviewCardClassName(hasHumanEdits: boolean) {
  void hasHumanEdits;
  return "rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-950/90";
}
