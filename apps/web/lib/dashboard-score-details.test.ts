import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getVisibleScoreReasons,
  shouldShowScoreDetailsToggle,
} from "./dashboard-score-details.ts";

describe("dashboard score details helpers", () => {
  it("limits collapsed score reasons to the top two", () => {
    const reasons = ["One", "Two", "Three"];

    assert.deepEqual(getVisibleScoreReasons(reasons, false), ["One", "Two"]);
  });

  it("shows all reasons when expanded", () => {
    const reasons = ["One", "Two", "Three"];

    assert.deepEqual(getVisibleScoreReasons(reasons, true), reasons);
  });

  it("renders safely with empty and missing-like text", () => {
    assert.deepEqual(getVisibleScoreReasons(["", "Valid"], false), ["Valid"]);
  });

  it("only shows toggle when more than two reasons exist", () => {
    assert.equal(shouldShowScoreDetailsToggle(["One", "Two"]), false);
    assert.equal(shouldShowScoreDetailsToggle(["One", "Two", "Three"]), true);
  });
});
