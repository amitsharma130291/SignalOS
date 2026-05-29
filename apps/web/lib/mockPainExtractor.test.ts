import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BANNED_GENERIC_PHRASES } from "./pain-summary-generator.ts";
import { mockPainExtractor } from "./mockPainExtractor.ts";
import { filterRawInput } from "./filterRawInput.ts";

describe("mockPainExtractor v2 fields", () => {
  it("extracts frequency", () => {
    assert.equal(mockPainExtractor("Team updates reports every week.").frequency, "weekly");
    assert.equal(mockPainExtractor("Team updates reports every Friday.").frequency, "weekly");
    assert.equal(mockPainExtractor("Team does this daily.").frequency, "daily");
    assert.equal(mockPainExtractor("Team does this multiple times per day.").frequency, "daily");
    assert.equal(mockPainExtractor("Support checks tickets multiple times a day.").frequency, "daily");
    assert.equal(mockPainExtractor("Team does this several times per day.").frequency, "daily");
    assert.equal(mockPainExtractor("Support checks tickets several times a day.").frequency, "daily");
    assert.equal(mockPainExtractor("Team does this many times per day.").frequency, "daily");
    assert.equal(
      mockPainExtractor("Sales Ops updates CRM fields after every customer call.").frequency,
      "per_event",
    );
    assert.equal(mockPainExtractor("Team coordinates approvals manually.").frequency, "unknown");
  });

  it("extracts current solution", () => {
    assert.equal(mockPainExtractor("Team tracks this in spreadsheets.").currentSolution, "Spreadsheets");
    assert.equal(mockPainExtractor("Team tracks this in Excel.").currentSolution, "Excel");
    assert.equal(
      mockPainExtractor("Customer Success manages onboarding through Slack and spreadsheets.").currentSolution,
      "Slack + Spreadsheets",
    );
    assert.equal(
      mockPainExtractor("Finance reconciles NetSuite records using spreadsheets.").currentSolution,
      "NetSuite + Spreadsheets",
    );
    assert.equal(mockPainExtractor("Team has coordination delays.").currentSolution, "Unknown");
  });

  it("extracts solution gaps", () => {
    assert.equal(
      mockPainExtractor("Manual spreadsheets create reporting delays.").solutionGap,
      "Manual tracking creates reporting delays and follow-up work.",
    );
    assert.equal(
      mockPainExtractor("Finance has reconciliation cleanup every month.").solutionGap,
      "Manual reconciliation creates cleanup work and reporting delays.",
    );
    assert.equal(
      mockPainExtractor("Slack handoffs create visibility gaps.").solutionGap,
      "Manual handoffs create missed ownership and visibility gaps.",
    );
    assert.equal(
      mockPainExtractor("Internal approval bottlenecks slow requests.").solutionGap,
      "Manual approvals create bottlenecks and follow-up burden.",
    );
  });

  it("maps affected teams from stronger v2 signals", () => {
    assert.equal(
      mockPainExtractor("Finance reconciles Stripe payouts with NetSuite every week.").affectedTeam,
      "Finance Ops",
    );
    assert.equal(
      mockPainExtractor("Sales Ops updates CRM reporting fields after customer calls.").affectedTeam,
      "Sales Ops",
    );
    assert.equal(
      mockPainExtractor("Customer Success manages onboarding handoffs in Slack.").affectedTeam,
      "Customer Success",
    );
    assert.equal(mockPainExtractor("Support triages Zendesk tickets from a queue.").affectedTeam, "Support");
    assert.equal(
      mockPainExtractor("Recruiting handles interview scheduling for candidates.").affectedTeam,
      "Recruiting",
    );
  });

  it("keeps pain summaries specific and tool-grounded", () => {
    const finance = mockPainExtractor(
      "Finance Ops manually reconciles Stripe payouts with NetSuite through spreadsheets.",
    );
    const crm = mockPainExtractor("Sales Ops updates CRM reporting fields manually after customer calls.");
    const onboarding = mockPainExtractor(
      "Customer Success manages onboarding handoffs through spreadsheets and Slack.",
    );

    assert.ok(finance.pain.includes("Stripe") || finance.pain.includes("NetSuite"));
    assert.ok(crm.pain.includes("CRM"));
    assert.ok(crm.pain.includes("reporting"));
    assert.ok(onboarding.pain.includes("onboarding"));
    assert.ok(onboarding.pain.includes("handoffs"));

    for (const pain of [finance.pain, crm.pain, onboarding.pain]) {
      for (const phrase of BANNED_GENERIC_PHRASES) {
        assert.equal(pain.toLowerCase().includes(phrase), false);
      }
    }
  });

  it("extracts Day 12 regression finance enrichment fields", () => {
    const extraction = mockPainExtractor(
      "Our finance team manually reconciles Stripe payouts against NetSuite every Friday using spreadsheets.",
    );

    assert.equal(extraction.frequency, "weekly");
    assert.ok(extraction.currentSolution.includes("NetSuite"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.notEqual(extraction.solutionGap, "Unknown");
  });

  it("extracts support escalation frequency and solution gap", () => {
    const extraction = mockPainExtractor(
      "Support agents copy Zendesk tickets into Slack channels multiple times per day to coordinate escalations with engineering. Team leads manually track ticket status in spreadsheets because there is no reliable workflow between systems. As ticket volume grows, response times are slipping and escalations are getting lost.",
    );

    assert.equal(extraction.affectedTeam, "Support");
    assert.equal(extraction.frequency, "daily");
    assert.ok(extraction.currentSolution.includes("Zendesk"));
    assert.ok(extraction.currentSolution.includes("Slack"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("visibility gaps"));
    assert.ok(extraction.solutionGap.includes("response delays"));
    assert.ok(extraction.solutionGap.includes("missed escalations"));
  });

  it("extracts recruiting tools and scheduling solution gap", () => {
    const extraction = mockPainExtractor(
      "Recruiting coordinators move candidates between LinkedIn, Greenhouse, Slack, and Email for interview scheduling. Hiring manager feedback creates feedback bottlenecks and candidate response delays.",
    );

    assert.equal(extraction.affectedTeam, "Recruiting");
    assert.ok(extraction.currentSolution.includes("LinkedIn"));
    assert.ok(extraction.currentSolution.includes("Greenhouse"));
    assert.ok(extraction.currentSolution.includes("Slack"));
    assert.ok(extraction.currentSolution.includes("Email"));
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("scheduling delays"));
    assert.ok(extraction.solutionGap.includes("recruiting coordination bottlenecks"));
  });

  it("extracts finance reconciliation exception solution gap", () => {
    const extraction = mockPainExtractor(
      "Finance Ops tracks reconciliation mismatches and exception tracking in NetSuite spreadsheets before reporting deadlines, causing month-end close delays.",
    );

    assert.equal(extraction.affectedTeam, "Finance Ops");
    assert.ok(extraction.currentSolution.includes("NetSuite"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("mismatches"));
    assert.ok(extraction.solutionGap.includes("exception tracking"));
    assert.ok(extraction.solutionGap.includes("reporting delays"));
    assert.ok(extraction.solutionGap.includes("month-end close delays"));
  });

  it("extracts Sales Ops forecast and pipeline reporting solution gap", () => {
    const extraction = mockPainExtractor(
      "Sales Ops does manual validation on CRM pipeline reporting, causing missed updates and forecast accuracy issues.",
    );

    assert.equal(extraction.affectedTeam, "Sales Ops");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("forecasting delays"));
    assert.ok(extraction.solutionGap.includes("reporting accuracy issues"));
  });

  it("extracts Recruiting interview scheduling solution gap without explicit delay wording", () => {
    const extraction = mockPainExtractor(
      "Recruiting coordinates interview scheduling across Greenhouse and Slack while hiring manager feedback creates feedback bottlenecks.",
    );

    assert.equal(extraction.affectedTeam, "Recruiting");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("scheduling delays"));
    assert.ok(extraction.solutionGap.includes("recruiting coordination bottlenecks"));
  });

  it("extracts Support missed escalation and response delay solution gap", () => {
    const extraction = mockPainExtractor(
      "Support has missed escalations and response delays because Zendesk ticket visibility gaps are tracked manually.",
    );

    assert.equal(extraction.affectedTeam, "Support");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("visibility gaps"));
    assert.ok(extraction.solutionGap.includes("response delays"));
    assert.ok(extraction.solutionGap.includes("missed escalations"));
  });

  it("extracts Sales Ops forecasting operational consequences", () => {
    const extraction = mockPainExtractor(
      "Sales Ops does manual validation and cross-checking for pipeline reporting, but missed updates are creating forecasting delays.",
    );

    assert.equal(extraction.affectedTeam, "Sales Ops");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("forecasting delays"));
    assert.ok(extraction.solutionGap.includes("reporting accuracy issues"));
  });

  it("extracts Customer Success renewal visibility consequences", () => {
    const extraction = mockPainExtractor(
      "Customer Success manages renewal visibility in Slack, and status update coordination creates workflow bottlenecks before renewal calls.",
    );

    assert.equal(extraction.affectedTeam, "Customer Success");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("renewal visibility gaps"));
    assert.ok(extraction.solutionGap.includes("reporting delays"));
  });

  it("extracts Recruiting candidate scheduling consequences", () => {
    const extraction = mockPainExtractor(
      "Recruiting has candidate scheduling delays because interview scheduling moves between Greenhouse, Slack, and email, creating feedback bottlenecks.",
    );

    assert.equal(extraction.affectedTeam, "Recruiting");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("scheduling delays"));
    assert.ok(extraction.solutionGap.includes("recruiting coordination bottlenecks"));
  });

  it("extracts Support escalation ownership consequences", () => {
    const extraction = mockPainExtractor(
      "Support sees missed tickets and escalation ownership confusion in Zendesk, so response time increases throughout the day.",
    );

    assert.equal(extraction.affectedTeam, "Support");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("visibility gaps"));
    assert.ok(extraction.solutionGap.includes("response delays"));
    assert.ok(extraction.solutionGap.includes("missed escalations"));
  });

  it("extracts Finance reconciliation cross-checking consequences", () => {
    const extraction = mockPainExtractor(
      "Finance uses NetSuite spreadsheets for reconciliation mismatches and cross-checking, causing exception tracking and month-end close delays.",
    );

    assert.equal(extraction.affectedTeam, "Finance Ops");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("cross-checking"));
    assert.ok(extraction.solutionGap.includes("exception tracking"));
    assert.ok(extraction.solutionGap.includes("month-end close delays"));
  });

  it("extracts Sales Ops outdated CRM reporting gap", () => {
    const extraction = mockPainExtractor(
      "Sales Ops works from an outdated CRM and does manual verification before forecast meetings, causing forecast delays and reporting accuracy issues.",
    );

    assert.equal(extraction.affectedTeam, "Sales Ops");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("forecasting delays"));
    assert.ok(extraction.solutionGap.includes("reporting accuracy issues"));
  });

  it("extracts Customer Success health score renewal gap", () => {
    const extraction = mockPainExtractor(
      "Customer Success does manual cleanup and cross-checking during health score review, which hurts renewal visibility.",
    );

    assert.equal(extraction.affectedTeam, "Customer Success");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("reporting delays"));
    assert.ok(extraction.solutionGap.includes("renewal visibility gaps"));
  });

  it("extracts Recruiting manual status update scheduling gap", () => {
    const extraction = mockPainExtractor(
      "Recruiting handles manual status updates across Greenhouse and Slack, and interview coordination creates scheduling delays.",
    );

    assert.equal(extraction.affectedTeam, "Recruiting");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("scheduling delays"));
    assert.ok(extraction.solutionGap.includes("recruiting coordination bottlenecks"));
  });

  it("extracts Support ownership and escalation workflow gap", () => {
    const extraction = mockPainExtractor(
      "Support says ownership unclear in the escalation workflow, causing missed tickets and response delays.",
    );

    assert.equal(extraction.affectedTeam, "Support");
    assert.notEqual(extraction.solutionGap, "Unknown");
    assert.ok(extraction.solutionGap.includes("visibility gaps"));
    assert.ok(extraction.solutionGap.includes("response delays"));
  });

  it("validates the exact Day 12 finance signal", () => {
    const signal =
      "Finance analysts download Stripe payouts every day and manually reconcile them against NetSuite. Exceptions are tracked in spreadsheets and month-end close is delayed whenever transaction volume increases.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Finance Ops");
    assert.equal(extraction.frequency, "daily");
    assert.ok(extraction.currentSolution.includes("Stripe"));
    assert.ok(extraction.currentSolution.includes("NetSuite"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.notEqual(extraction.solutionGap, "Unknown");
  });

  it("validates the exact Day 12 weekly Sales Ops signal", () => {
    const signal =
      "Revenue managers export HubSpot opportunities into spreadsheets every Monday before forecast calls. Team leads manually verify pipeline numbers because CRM data is often outdated.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Sales Ops");
    assert.equal(extraction.frequency, "weekly");
    assert.ok(extraction.currentSolution.includes("HubSpot"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.equal(
      extraction.solutionGap,
      "Outdated CRM data and manual verification create forecasting delays and reporting accuracy issues.",
    );
  });

  it("validates the exact Day 12 Customer Success renewal signal", () => {
    const signal =
      "Customer Success managers export Salesforce account data into Airtable every Monday before renewal meetings. Teams manually clean customer records and cross-check health scores.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Customer Success");
    assert.equal(extraction.frequency, "weekly");
    assert.ok(extraction.currentSolution.includes("Salesforce"));
    assert.ok(extraction.currentSolution.includes("Airtable"));
    assert.equal(
      extraction.solutionGap,
      "Manual cleanup and health-score cross-checking create reporting delays and renewal visibility gaps.",
    );
  });

  it("validates the exact Day 12 Recruiting signal", () => {
    const signal =
      "Recruiters move candidate information from LinkedIn into Greenhouse several times per day. Interview feedback arrives through Slack and email, forcing coordinators to manually update candidate status.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Recruiting");
    assert.equal(extraction.frequency, "daily");
    assert.ok(extraction.currentSolution.includes("LinkedIn"));
    assert.ok(extraction.currentSolution.includes("Greenhouse"));
    assert.ok(extraction.currentSolution.includes("Slack"));
    assert.ok(extraction.currentSolution.includes("Email"));
    assert.equal(
      extraction.solutionGap,
      "Manual status updates and scattered interview feedback create scheduling delays and recruiting coordination bottlenecks.",
    );
  });

  it("validates the exact Day 12 Support signal", () => {
    const signal =
      "Support agents copy Zendesk tickets into Slack channels throughout the day to coordinate escalations. Team leads maintain escalation spreadsheets because ownership is unclear.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Support");
    assert.equal(extraction.frequency, "daily");
    assert.ok(extraction.currentSolution.includes("Zendesk"));
    assert.ok(extraction.currentSolution.includes("Slack"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.equal(
      extraction.solutionGap,
      "Unclear ownership and manual escalation tracking create visibility gaps, missed escalations, and response delays.",
    );
  });

  it("validates the exact Day 12 monthly Operations signal", () => {
    const signal =
      "Operations managers prepare compliance reports at the end of every month using spreadsheets and manually collected data from several systems.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Operations");
    assert.equal(extraction.frequency, "monthly");
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.equal(
      extraction.solutionGap,
      "Manual compliance reporting across several systems creates reporting delays and coordination work.",
    );
  });

  it("extracts the exact quarterly Operations compliance audit signal", () => {
    const signal =
      "Operations managers collect compliance information from six internal systems at the end of every quarter. Reporting preparation requires manual spreadsheet consolidation before audits.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Operations");
    assert.equal(extraction.frequency, "quarterly");
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.ok(extraction.currentSolution.includes("Internal systems"));
    assert.equal(
      extraction.solutionGap,
      "Manual spreadsheet consolidation across several systems creates compliance reporting delays and audit-prep bottlenecks.",
    );
  });

  it("validates the exact Day 12 quarterly Customer Success signal", () => {
    const signal =
      "Customer Success leadership performs a quarterly renewal risk review by exporting Salesforce data into spreadsheets and manually aggregating customer health metrics.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Customer Success");
    assert.equal(extraction.frequency, "quarterly");
    assert.ok(extraction.currentSolution.includes("Salesforce"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.notEqual(extraction.solutionGap, "Unknown");
  });

  it("validates the exact Day 12 multi-tool Sales Ops signal", () => {
    const signal =
      "Sales Operations exports HubSpot data into Airtable, reviews updates in Slack, validates numbers in spreadsheets, and updates Salesforce records before every forecast meeting.";
    const extraction = mockPainExtractor(signal);

    assert.equal(extraction.affectedTeam, "Sales Ops");
    assert.ok(extraction.currentSolution.includes("HubSpot"));
    assert.ok(extraction.currentSolution.includes("Airtable"));
    assert.ok(extraction.currentSolution.includes("Slack"));
    assert.ok(extraction.currentSolution.includes("Salesforce"));
    assert.ok(extraction.currentSolution.includes("Spreadsheets"));
    assert.equal(
      extraction.solutionGap,
      "Manual validation across multiple sales tools creates forecasting delays, reporting accuracy issues, and visibility gaps.",
    );
  });

  it("keeps the exact Day 12 low-value support signal low scoring", () => {
    const filter = filterRawInput("Support leaders occasionally discuss ticket ownership during monthly meetings.");

    assert.ok(filter.score < 20);
    assert.notEqual(filter.confidence, "high");
  });

  it("does not generate fake pain for the exact Day 12 noise signal", () => {
    const signal = "Our company had a team lunch on Friday and everyone discussed future plans.";
    const filter = filterRawInput(signal);
    const extraction = mockPainExtractor(signal, filter);

    assert.equal(filter.status, "filtered_out");
    assert.equal(extraction.pain, "No meaningful operational pain detected.");
    assert.equal(extraction.pain.includes("coordinationaround"), false);
  });

  it("keeps recruiting workflow signals for extraction", () => {
    const signal =
      "Recruiters move candidate information between LinkedIn and Greenhouse and then chase hiring managers for interview feedback through Slack. Candidate status is often outdated and scheduling takes too long.";
    const filter = filterRawInput(signal);
    const extraction = mockPainExtractor(signal, filter);

    assert.notEqual(filter.status, "filtered_out");
    assert.ok(filter.confidence === "medium" || filter.confidence === "high");
    assert.equal(extraction.affectedTeam, "Recruiting");
    assert.ok(extraction.currentSolution.includes("LinkedIn"));
    assert.ok(extraction.currentSolution.includes("Greenhouse"));
    assert.ok(extraction.currentSolution.includes("Slack"));
  });
});
