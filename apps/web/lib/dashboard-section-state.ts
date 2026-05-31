export type OpportunitySectionId = "buyer_mapping" | "evidence" | "icp" | "score" | "solution_gap";

export function getOpportunitySectionKey(opportunityId: string, sectionId: OpportunitySectionId) {
  return `${opportunityId}:${sectionId}`;
}

export function isOpportunitySectionExpanded(
  expandedSections: ReadonlySet<string>,
  opportunityId: string,
  sectionId: OpportunitySectionId,
) {
  return expandedSections.has(getOpportunitySectionKey(opportunityId, sectionId));
}

export function toggleOpportunitySection(
  expandedSections: ReadonlySet<string>,
  opportunityId: string,
  sectionId: OpportunitySectionId,
) {
  const nextSections = new Set(expandedSections);
  const sectionKey = getOpportunitySectionKey(opportunityId, sectionId);

  if (nextSections.has(sectionKey)) {
    nextSections.delete(sectionKey);
  } else {
    nextSections.add(sectionKey);
  }

  return nextSections;
}
