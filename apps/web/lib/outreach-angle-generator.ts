import { matchesKeyword } from "./filterRawInput.ts";
import {
  compactSentence,
  enforceNoGenericPhrases,
  getMentionedTools,
  getWorkflowNouns,
  joinSignalNouns,
  type PainSummaryInput,
} from "./pain-summary-generator.ts";

function finishAngle(angle: string) {
  return compactSentence(enforceNoGenericPhrases(angle), 120);
}

export function generateOutreachAngle({ rawText, affectedTeam }: PainSummaryInput) {
  const tools = getMentionedTools(rawText);
  const workflows = getWorkflowNouns(rawText);
  const toolPhrase = joinSignalNouns(tools);

  if (
    (affectedTeam === "Finance Ops" || matchesKeyword(rawText, "finance")) &&
    (workflows.includes("reconciliation") || tools.includes("Stripe") || tools.includes("NetSuite"))
  ) {
    if (tools.includes("Stripe") && tools.includes("NetSuite")) {
      return finishAngle("Reduce manual Stripe and NetSuite reconciliation work.");
    }

    return finishAngle(
      `Reduce manual reconciliation${toolPhrase ? ` across ${toolPhrase}` : ""}.`,
    );
  }

  if (affectedTeam === "Sales Ops" && (tools.includes("CRM") || workflows.includes("reporting"))) {
    return tools.includes("CRM") && workflows.includes("reporting")
      ? finishAngle("Automate CRM reporting updates for sales teams.")
      : finishAngle("Reduce manual CRM updates for Sales Ops.");
  }

  if (affectedTeam === "Customer Success" || workflows.includes("onboarding")) {
    return tools.includes("spreadsheets")
      ? finishAngle("Eliminate spreadsheet-based onboarding handoffs.")
      : finishAngle("Streamline onboarding handoffs across CS teams.");
  }

  if (workflows.includes("interview scheduling")) {
    return tools.includes("Slack")
      ? finishAngle("Replace Slack-based interview scheduling coordination.")
      : finishAngle("Reduce manual interview scheduling coordination.");
  }

  if (workflows.includes("approvals") || workflows.includes("procurement")) {
    return finishAngle(
      `Reduce manual ${workflows.includes("procurement") ? "procurement approval" : "approval"} follow-up${
        toolPhrase ? ` across ${toolPhrase}` : ""
      }.`,
    );
  }

  if (affectedTeam === "Support") {
    if (tools.includes("Zendesk") || workflows.includes("support queue") || workflows.includes("tickets")) {
      return finishAngle("Reduce repetitive Zendesk ticket triage for support teams.");
    }

    return finishAngle("Reduce repetitive support request triage.");
  }

  const workflowPhrase = joinSignalNouns([...workflows, ...tools]);
  return finishAngle(
    workflowPhrase
      ? `Reduce manual coordination around ${workflowPhrase}.`
      : "Reduce repetitive manual coordination.",
  );
}
