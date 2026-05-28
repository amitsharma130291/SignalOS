import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getOpportunitySectionKey,
  isOpportunitySectionExpanded,
  toggleOpportunitySection,
} from "./dashboard-section-state.ts";

describe("opportunity dashboard section state", () => {
  it("keeps collapsible sections hidden by default", () => {
    const expandedSections = new Set<string>();

    assert.equal(isOpportunitySectionExpanded(expandedSections, "pain-1", "icp"), false);
    assert.equal(isOpportunitySectionExpanded(expandedSections, "pain-1", "score"), false);
  });

  it("toggles expansion state", () => {
    const expandedSections = new Set<string>();
    const expanded = toggleOpportunitySection(expandedSections, "pain-1", "icp");
    const collapsed = toggleOpportunitySection(expanded, "pain-1", "icp");

    assert.equal(expanded.has(getOpportunitySectionKey("pain-1", "icp")), true);
    assert.equal(collapsed.has(getOpportunitySectionKey("pain-1", "icp")), false);
  });
});
