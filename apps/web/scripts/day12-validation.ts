import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { filterRawInput } from "../lib/filterRawInput.ts";
import { mockPainExtractor } from "../lib/mockPainExtractor.ts";

type ExtractionResult = ReturnType<typeof mockPainExtractor>;
type FilterResult = ReturnType<typeof filterRawInput>;

type ValidationExpectation = {
  affectedTeam?: string;
  frequency?: string;
  currentSolutionContains?: string[];
  solutionGapContainsAny?: string[];
  scoreGreaterThan?: number;
  scoreLessThan?: number;
  confidenceOneOf?: FilterResult["confidence"][];
  notHighOpportunity?: boolean;
  noMeaningfulOpportunity?: boolean;
};

type ValidationCase = {
  name: string;
  signal: string;
  expected: ValidationExpectation;
};

type AssertionResult = {
  label: string;
  passed: boolean;
  actual: unknown;
  expected: unknown;
};

type ValidationResult = {
  name: string;
  signal: string;
  extracted: {
    pain: string;
    affectedTeam: string;
    frequency: string;
    currentSolution: string;
    solutionGap: string;
    urgency: string;
    b2bScore: number;
    monetizationScore: number;
    filterScore: number;
    validationScore: number;
    confidence: FilterResult["confidence"];
    filterStatus: FilterResult["status"];
    marketType: FilterResult["marketType"];
    classifier: unknown;
  };
  assertions: AssertionResult[];
  passed: boolean;
  failedAssertions: AssertionResult[];
};

const TEST_CASES: ValidationCase[] = [
  {
    name: "TEST 1 - DAILY FINANCE",
    signal:
      "Finance analysts download Stripe payouts every day and manually reconcile them against NetSuite. Exceptions are tracked in spreadsheets and month-end close is delayed whenever transaction volume increases.",
    expected: {
      affectedTeam: "Finance Ops",
      frequency: "daily",
      currentSolutionContains: ["Stripe", "NetSuite", "Spreadsheets"],
      solutionGapContainsAny: ["reconciliation", "exception tracking", "reporting delays", "month-end close"],
      scoreGreaterThan: 50,
    },
  },
  {
    name: "TEST 2 - WEEKLY SALES OPS",
    signal:
      "Revenue managers export HubSpot opportunities into spreadsheets every Monday before forecast calls. Team leads manually verify pipeline numbers because CRM data is often outdated.",
    expected: {
      affectedTeam: "Sales Ops",
      frequency: "weekly",
      currentSolutionContains: ["HubSpot", "Spreadsheets"],
      solutionGapContainsAny: [
        "outdated CRM data",
        "manual verification",
        "forecasting delays",
        "reporting accuracy",
        "visibility",
      ],
      scoreGreaterThan: 70,
    },
  },
  {
    name: "TEST 3 - CUSTOMER SUCCESS",
    signal:
      "Customer Success managers export Salesforce account data into Airtable every Monday before renewal meetings. Teams manually clean customer records and cross-check health scores.",
    expected: {
      affectedTeam: "Customer Success",
      frequency: "weekly",
      currentSolutionContains: ["Salesforce", "Airtable"],
      solutionGapContainsAny: [
        "manual cleanup",
        "cross-checking",
        "reporting delays",
        "renewal visibility",
        "health score visibility",
      ],
      scoreGreaterThan: 40,
    },
  },
  {
    name: "TEST 4 - RECRUITING",
    signal:
      "Recruiters move candidate information from LinkedIn into Greenhouse several times per day. Interview feedback arrives through Slack and email, forcing coordinators to manually update candidate status.",
    expected: {
      affectedTeam: "Recruiting",
      frequency: "daily",
      currentSolutionContains: ["LinkedIn", "Greenhouse", "Slack", "Email"],
      solutionGapContainsAny: [
        "manual status updates",
        "scheduling delays",
        "feedback bottlenecks",
        "candidate tracking",
        "coordination work",
      ],
      scoreGreaterThan: 20,
    },
  },
  {
    name: "TEST 5 - SUPPORT",
    signal:
      "Support agents copy Zendesk tickets into Slack channels throughout the day to coordinate escalations. Team leads maintain escalation spreadsheets because ownership is unclear.",
    expected: {
      affectedTeam: "Support",
      frequency: "daily",
      currentSolutionContains: ["Zendesk", "Slack", "Spreadsheets"],
      solutionGapContainsAny: [
        "ownership ambiguity",
        "missed escalations",
        "visibility gaps",
        "response delays",
        "escalation tracking",
      ],
      scoreGreaterThan: 40,
    },
  },
  {
    name: "TEST 6 - MONTHLY OPS",
    signal:
      "Operations managers prepare compliance reports at the end of every month using spreadsheets and manually collected data from several systems.",
    expected: {
      affectedTeam: "Operations",
      frequency: "monthly",
      currentSolutionContains: ["Spreadsheets"],
      solutionGapContainsAny: [
        "manual reporting",
        "compliance reporting",
        "collected data",
        "reporting delays",
        "coordination work",
      ],
      scoreGreaterThan: 50,
    },
  },
  {
    name: "TEST 7 - QUARTERLY CUSTOMER SUCCESS",
    signal:
      "Customer Success leadership performs a quarterly renewal risk review by exporting Salesforce data into spreadsheets and manually aggregating customer health metrics.",
    expected: {
      affectedTeam: "Customer Success",
      frequency: "quarterly",
      currentSolutionContains: ["Salesforce", "Spreadsheets"],
      solutionGapContainsAny: [
        "renewal risk",
        "customer health metrics",
        "manual aggregation",
        "visibility gaps",
        "reporting delays",
      ],
    },
  },
  {
    name: "TEST 8 - MULTI TOOL SPRAWL",
    signal:
      "Sales Operations exports HubSpot data into Airtable, reviews updates in Slack, validates numbers in spreadsheets, and updates Salesforce records before every forecast meeting.",
    expected: {
      affectedTeam: "Sales Ops",
      currentSolutionContains: ["HubSpot", "Airtable", "Slack", "Salesforce", "Spreadsheets"],
      solutionGapContainsAny: ["forecasting delays", "reporting accuracy", "visibility", "manual validation"],
      scoreGreaterThan: 70,
    },
  },
  {
    name: "TEST 9 - LOW VALUE SIGNAL",
    signal: "Support leaders occasionally discuss ticket ownership during monthly meetings.",
    expected: {
      scoreLessThan: 20,
      confidenceOneOf: ["low", "medium"],
      notHighOpportunity: true,
    },
  },
  {
    name: "TEST 10 - NOISE FILTER",
    signal: "Our company had a team lunch on Friday and everyone discussed future plans.",
    expected: {
      scoreLessThan: 10,
      noMeaningfulOpportunity: true,
    },
  },
];

function getFilterMetadata(filter: FilterResult) {
  return {
    operationalScore: filter.operationalScore,
    b2bScore: filter.b2bScore,
    marketType: filter.marketType,
    matchedPositiveKeywords: filter.matchedPositiveKeywords,
    matchedB2BKeywords: filter.matchedB2BKeywords,
    status: filter.status,
    confidence: filter.confidence,
  };
}

function getClassifier(extraction: ExtractionResult) {
  const output = extraction.aiOutput;
  const classification = output.extractionClassification;

  return classification && typeof classification === "object" ? classification : null;
}

function getValidationScore(filter: FilterResult, extraction: ExtractionResult) {
  if (filter.status === "filtered_out") return Math.max(0, filter.score * 5);

  let score = filter.operationalScore * 8 + filter.b2bScore * 6 + extraction.monetizationScore * 5;

  if (extraction.solutionGap !== "Unknown") score += 10;
  if (extraction.currentSolution !== "Unknown") score += 10;
  if (extraction.frequency !== "unknown") score += 5;
  if (filter.confidence === "high") score += 5;
  if (filter.confidence === "low") score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalize(value: string) {
  return value.toLowerCase();
}

function includesAny(value: string, needles: string[]) {
  const normalized = normalize(value);
  return needles.some((needle) => normalized.includes(normalize(needle)));
}

function countTools(currentSolution: string) {
  if (currentSolution === "Unknown") return 0;
  return currentSolution.split("+").map((tool) => tool.trim()).filter(Boolean).length;
}

function assertEqual(label: string, actual: unknown, expected: unknown): AssertionResult {
  return {
    label,
    actual,
    expected,
    passed: actual === expected,
  };
}

function assertContains(label: string, actual: string, expected: string): AssertionResult {
  return {
    label,
    actual,
    expected: `contains ${expected}`,
    passed: normalize(actual).includes(normalize(expected)),
  };
}

function assertContainsAny(label: string, actual: string, expected: string[]): AssertionResult {
  return {
    label,
    actual,
    expected: `contains any of: ${expected.join(", ")}`,
    passed: includesAny(actual, expected),
  };
}

function assertNotEqual(label: string, actual: unknown, expected: unknown): AssertionResult {
  return {
    label,
    actual,
    expected: `not ${String(expected)}`,
    passed: actual !== expected,
  };
}

function assertGreaterThan(label: string, actual: number, expected: number): AssertionResult {
  return {
    label,
    actual,
    expected: `> ${expected}`,
    passed: actual > expected,
  };
}

function assertLessThan(label: string, actual: number, expected: number): AssertionResult {
  return {
    label,
    actual,
    expected: `< ${expected}`,
    passed: actual < expected,
  };
}

function assertOneOf<T>(label: string, actual: T, expected: T[]): AssertionResult {
  return {
    label,
    actual,
    expected,
    passed: expected.includes(actual),
  };
}

function getSuggestedRules(result: ValidationResult) {
  const rules = new Set<string>();

  for (const assertion of result.failedAssertions) {
    if (assertion.label.includes("affectedTeam")) {
      rules.add(`Team classifier needs coverage for: ${result.signal}`);
    }
    if (assertion.label.includes("frequency")) {
      rules.add(`Frequency extractor needs coverage for: ${result.signal}`);
    }
    if (assertion.label.includes("currentSolution")) {
      rules.add(`Current solution extractor needs tool coverage for: ${result.signal}`);
    }
    if (assertion.label.includes("solutionGap")) {
      rules.add(`Solution gap extractor needs consequence coverage for: ${result.signal}`);
    }
    if (assertion.label.includes("score") || assertion.label.includes("opportunity")) {
      rules.add(`Filter scoring/confidence needs calibration for: ${result.signal}`);
    }
  }

  return [...rules];
}

function validateTest(testCase: ValidationCase): ValidationResult {
  const filter = filterRawInput(testCase.signal);
  const extraction = mockPainExtractor(testCase.signal, getFilterMetadata(filter));
  const validationScore = getValidationScore(filter, extraction);
  const assertions: AssertionResult[] = [];
  const expected = testCase.expected;

  if (expected.affectedTeam) {
    assertions.push(assertEqual("affectedTeam", extraction.affectedTeam, expected.affectedTeam));
  }

  if (expected.frequency) {
    assertions.push(assertEqual("frequency", extraction.frequency, expected.frequency));
  }

  for (const tool of expected.currentSolutionContains ?? []) {
    assertions.push(assertContains("currentSolution", extraction.currentSolution, tool));
  }

  if (expected.solutionGapContainsAny) {
    assertions.push(assertNotEqual("solutionGap", extraction.solutionGap, "Unknown"));
    assertions.push(assertContainsAny("solutionGap", extraction.solutionGap, expected.solutionGapContainsAny));
  }

  if (testCase.name.includes("MULTI TOOL SPRAWL")) {
    assertions.push(assertGreaterThan("toolCount", countTools(extraction.currentSolution), 4));
  }

  if (typeof expected.scoreGreaterThan === "number") {
    assertions.push(assertGreaterThan("validationScore", validationScore, expected.scoreGreaterThan));
  }

  if (typeof expected.scoreLessThan === "number") {
    assertions.push(assertLessThan("validationScore", validationScore, expected.scoreLessThan));
  }

  if (expected.confidenceOneOf) {
    assertions.push(assertOneOf("confidence", filter.confidence, expected.confidenceOneOf));
  }

  if (expected.notHighOpportunity) {
    assertions.push({
      label: "not high opportunity",
      actual: { validationScore, confidence: filter.confidence, status: filter.status },
      expected: "validationScore < 70 or confidence is not high",
      passed: validationScore < 70 || filter.confidence !== "high",
    });
  }

  if (expected.noMeaningfulOpportunity) {
    assertions.push({
      label: "no meaningful opportunity",
      actual: { validationScore, confidence: filter.confidence, status: filter.status },
      expected: "filtered_out, low confidence, or validationScore < 10",
      passed: filter.status === "filtered_out" || filter.confidence === "low" || validationScore < 10,
    });
  }

  const failedAssertions = assertions.filter((assertion) => !assertion.passed);

  return {
    name: testCase.name,
    signal: testCase.signal,
    extracted: {
      pain: extraction.pain,
      affectedTeam: extraction.affectedTeam,
      frequency: extraction.frequency,
      currentSolution: extraction.currentSolution,
      solutionGap: extraction.solutionGap,
      urgency: extraction.urgency,
      b2bScore: extraction.b2bScore,
      monetizationScore: extraction.monetizationScore,
      filterScore: filter.score,
      validationScore,
      confidence: filter.confidence,
      filterStatus: filter.status,
      marketType: filter.marketType,
      classifier: getClassifier(extraction),
    },
    assertions,
    passed: failedAssertions.length === 0,
    failedAssertions,
  };
}

function printReport(results: ValidationResult[]) {
  const totalAssertions = results.reduce((total, result) => total + result.assertions.length, 0);
  const failedAssertions = results.reduce((total, result) => total + result.failedAssertions.length, 0);
  const passedAssertions = totalAssertions - failedAssertions;
  const passPercentage = totalAssertions === 0 ? 100 : Math.round((passedAssertions / totalAssertions) * 10000) / 100;

  console.log("\nDay 12 Extraction Validation\n");
  console.table(
    results.map((result) => ({
      test: result.name,
      result: result.passed ? "PASS" : "FAIL",
      team: result.extracted.affectedTeam,
      frequency: result.extracted.frequency,
      solutionGap: result.extracted.solutionGap,
      score: result.extracted.validationScore,
      confidence: result.extracted.confidence,
      failedAssertions: result.failedAssertions.length,
    })),
  );

  for (const result of results) {
    console.log(`\n${result.name} - ${result.passed ? "PASS" : "FAIL"}`);
    console.log(`Raw signal: ${result.signal}`);
    console.log(`Extracted pain/title: ${result.extracted.pain}`);
    console.log(`Affected team: ${result.extracted.affectedTeam}`);
    console.log(`Frequency: ${result.extracted.frequency}`);
    console.log(`Current solution: ${result.extracted.currentSolution}`);
    console.log(`Solution gap: ${result.extracted.solutionGap}`);
    console.log(`Urgency: ${result.extracted.urgency}`);
    console.log(
      `Score/confidence: validationScore=${result.extracted.validationScore}, filterScore=${result.extracted.filterScore}, b2bScore=${result.extracted.b2bScore}, monetizationScore=${result.extracted.monetizationScore}, confidence=${result.extracted.confidence}`,
    );

    if (result.failedAssertions.length > 0) {
      console.log("Failed assertions:");
      for (const assertion of result.failedAssertions) {
        console.log(`- ${assertion.label}: expected ${JSON.stringify(assertion.expected)}, got ${JSON.stringify(assertion.actual)}`);
      }
      console.log("Extracted JSON:");
      console.log(JSON.stringify(result.extracted, null, 2));
    }
  }

  console.log("\nSummary");
  console.log(`Total passed assertions: ${passedAssertions}`);
  console.log(`Total failed assertions: ${failedAssertions}`);
  console.log(`Pass percentage: ${passPercentage}%`);

  if (passPercentage < 95) {
    const suggestedRules = results.flatMap(getSuggestedRules);
    console.log("\nExtraction rules that need fixing:");
    for (const rule of [...new Set(suggestedRules)]) {
      console.log(`- ${rule}`);
    }
  }
}

const results = TEST_CASES.map(validateTest);
const totalAssertions = results.reduce((total, result) => total + result.assertions.length, 0);
const failedAssertions = results.reduce((total, result) => total + result.failedAssertions.length, 0);
const passedAssertions = totalAssertions - failedAssertions;
const passPercentage = totalAssertions === 0 ? 100 : Math.round((passedAssertions / totalAssertions) * 10000) / 100;
const suggestedRules = passPercentage < 95 ? [...new Set(results.flatMap(getSuggestedRules))] : [];

const report = {
  generatedAt: new Date().toISOString(),
  pipeline: "filterRawInput -> mockPainExtractor",
  totals: {
    tests: results.length,
    passedTests: results.filter((result) => result.passed).length,
    failedTests: results.filter((result) => !result.passed).length,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    passPercentage,
  },
  suggestedRules,
  results,
};

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const reportPath = join(repoRoot, "artifacts", "day12-validation-report.json");

mkdirSync(dirname(reportPath), { recursive: true });
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

printReport(results);
console.log(`\nSaved JSON report: ${reportPath}`);
