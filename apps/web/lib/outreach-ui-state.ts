export function shouldShowGenerateOutreachDraftButton(status?: string | null, hasDraft = false) {
  return !hasDraft && (status === "approved" || status === "interesting");
}

export function shouldShowRegenerateOutreachDraftButton(status?: string | null, hasDraft = false) {
  return hasDraft && (status === "approved" || status === "interesting");
}

export function shouldShowHumanEditedBadge(hasHumanEdits: boolean) {
  return hasHumanEdits;
}
