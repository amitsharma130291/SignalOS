import type { Prisma } from "@prisma/client";
import { RunFilterButton } from "@/components/filter-actions";
import { GenerateICPButton } from "@/components/icp-actions";
import { ExtractPainButton } from "@/components/pain-extraction-actions";
import type { RawInputFilterConfidence, RawInputMarketType } from "@/lib/filterRawInput";

type RecentSignal = {
  id: string;
  inputType: string;
  sourceName: string | null;
  rawText: string;
  status: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  painSignals: {
    id: string;
    pain: string;
    urgency: string | null;
    affectedTeam: string | null;
    possibleIcp: string | null;
    outreachAngle: string | null;
    targetTitles: Prisma.JsonValue;
    companySize: string | null;
    industry: string | null;
    buyer: string | null;
    budgetOwner: string | null;
    triggerEvent: string | null;
    outreachAngleRefined: string | null;
    icpGeneratedAt: Date | null;
  }[];
};

type ParsedFilterMetadata = {
  operationalScore: number | null;
  confidence: RawInputFilterConfidence | null;
  marketType: RawInputMarketType;
  b2bScore: number | null;
  b2cScore: number | null;
  matchedPositiveKeywords: string[];
  matchedNegativeKeywords: string[];
};

function getPreview(text: string, maxLength = 140) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function formatInputType(type: string) {
  return type.replaceAll("_", " ");
}

function formatStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function parseFilterMetadata(metadata: Prisma.JsonValue): ParsedFilterMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const filterRecord = (metadata as Record<string, unknown>).filter;
  if (!filterRecord || typeof filterRecord !== "object" || Array.isArray(filterRecord)) {
    return null;
  }

  const filter = filterRecord as Record<string, unknown>;
  const operationalScore =
    typeof filter.operationalScore === "number"
      ? filter.operationalScore
      : typeof filter.score === "number"
        ? filter.score
        : null;
  const confidence =
    filter.confidence === "high" || filter.confidence === "medium" || filter.confidence === "low"
      ? filter.confidence
      : null;
  const marketType =
    filter.marketType === "b2b" || filter.marketType === "b2c" || filter.marketType === "unknown"
      ? filter.marketType
      : "unknown";
  const b2bScore = typeof filter.b2bScore === "number" ? filter.b2bScore : null;
  const b2cScore = typeof filter.b2cScore === "number" ? filter.b2cScore : null;
  const matchedPositiveKeywords = Array.isArray(filter.matchedPositiveKeywords)
    ? filter.matchedPositiveKeywords.filter((value): value is string => typeof value === "string")
    : [];
  const matchedNegativeKeywords = Array.isArray(filter.matchedNegativeKeywords)
    ? filter.matchedNegativeKeywords.filter((value): value is string => typeof value === "string")
    : [];
  return {
    operationalScore,
    confidence,
    marketType,
    b2bScore,
    b2cScore,
    matchedPositiveKeywords,
    matchedNegativeKeywords,
  };
}

function getStatusBadgeClassName(status: string) {
  if (status === "accepted") {
    return "rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
  }

  if (status === "filtered_out") {
    return "rounded-full bg-rose-100 px-2.5 py-1 font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300";
  }

  if (status === "needs_review") {
    return "rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  }

  return "rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

function getConfidenceBadgeClassName(confidence: RawInputFilterConfidence | null) {
  if (confidence === "high") {
    return "rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300";
  }

  if (confidence === "medium") {
    return "rounded-full bg-sky-100 px-2 py-0.5 font-medium text-sky-700 dark:bg-sky-950/50 dark:text-sky-300";
  }

  return "rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

function getMarketBadgeClassName(marketType: RawInputMarketType) {
  if (marketType === "b2b") {
    return "rounded-full bg-violet-100 px-2.5 py-1 font-medium uppercase text-violet-700 dark:bg-violet-950/50 dark:text-violet-300";
  }

  if (marketType === "b2c") {
    return "rounded-full bg-orange-100 px-2.5 py-1 font-medium uppercase text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
  }

  return "rounded-full bg-zinc-100 px-2.5 py-1 font-medium uppercase text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
}

function getVisibleKeywords(keywords: string[], limit = 3) {
  const visible = keywords.slice(0, limit);
  const hiddenCount = keywords.length - visible.length;

  if (hiddenCount <= 0) {
    return visible.join(", ");
  }

  return `${visible.join(", ")} +${hiddenCount} more`;
}

function getConciseReason(signalStatus: string, metadata: ParsedFilterMetadata | null) {
  if (!metadata) {
    return "Run filter to generate review details.";
  }

  if (signalStatus === "accepted") {
    return "Strong operational workflow signal detected.";
  }

  if ((metadata.b2cScore ?? 0) > (metadata.b2bScore ?? 0)) {
    return "Consumer/social-media style signal detected.";
  }

  if (signalStatus === "filtered_out") {
    return "No operational B2B pain signal detected.";
  }

  return "Weak operational signal. Needs manual review.";
}

function canExtractPain(status: string) {
  return status === "accepted" || status === "needs_review";
}

function parseTargetTitles(targetTitles: Prisma.JsonValue) {
  if (!Array.isArray(targetTitles)) {
    return [];
  }

  return targetTitles.filter((title): title is string => typeof title === "string");
}

export function RecentSignalsList({ signals }: { signals: RecentSignal[] }) {
  if (signals.length === 0) {
    return (
      <div className="animate-fade-in rounded-2xl border border-dashed border-zinc-300/80 bg-white/50 p-8 text-center dark:border-zinc-700/80 dark:bg-zinc-900/30">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          No signals saved yet
        </p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Paste your first pain signal above to get started.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {signals.map((signal, index) => {
        const filterMetadata = parseFilterMetadata(signal.metadata);
        const confidence = filterMetadata?.confidence ?? "low";
        const painSignal = signal.painSignals[0];
        const targetTitles = painSignal ? parseTargetTitles(painSignal.targetTitles) : [];
        return (
          <li
            key={signal.id}
            className="group animate-fade-up rounded-2xl border border-zinc-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-zinc-800/80 dark:bg-zinc-950/80 dark:hover:border-indigo-500/30"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 font-medium capitalize text-indigo-700 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:group-hover:bg-indigo-950">
                {formatInputType(signal.inputType)}
              </span>
              <span className={getStatusBadgeClassName(signal.status)}>
                {formatStatusLabel(signal.status)}
              </span>
              <span className={getMarketBadgeClassName(filterMetadata?.marketType ?? "unknown")}>
                {filterMetadata?.marketType ?? "unknown"}
              </span>
              <span className={getConfidenceBadgeClassName(confidence)}>
                {confidence} confidence
              </span>
              <span className="ml-0 text-[11px] text-zinc-400 dark:text-zinc-500 sm:ml-auto">
                {new Date(signal.createdAt).toLocaleString()}
              </span>
            </div>

            <p className="text-base leading-relaxed text-zinc-800 dark:text-zinc-200">
              {getPreview(signal.rawText)}
            </p>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>
                    Ops:{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {filterMetadata?.operationalScore ?? 0}
                    </span>
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>
                    B2B:{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {filterMetadata?.b2bScore ?? 0}
                    </span>
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>
                    B2C:{" "}
                    <span className="font-medium text-zinc-700 dark:text-zinc-200">
                      {filterMetadata?.b2cScore ?? 0}
                    </span>
                  </span>
                </div>

                {(filterMetadata?.matchedPositiveKeywords.length ||
                  filterMetadata?.matchedNegativeKeywords.length) ? (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    {filterMetadata.matchedPositiveKeywords.length ? (
                      <span className="break-words text-emerald-700 dark:text-emerald-400">
                        + {getVisibleKeywords(filterMetadata.matchedPositiveKeywords)}
                      </span>
                    ) : null}
                    {filterMetadata.matchedNegativeKeywords.length ? (
                      <span className="break-words text-rose-700 dark:text-rose-400">
                        - {getVisibleKeywords(filterMetadata.matchedNegativeKeywords)}
                      </span>
                    ) : null}
                  </div>
                ) : null}

                <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  Reason: {getConciseReason(signal.status, filterMetadata)}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-2 sm:flex-col sm:pt-0.5">
                <RunFilterButton rawInputId={signal.id} />
                {painSignal ? (
                  <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Pain extracted
                  </span>
                ) : canExtractPain(signal.status) ? (
                  <ExtractPainButton rawInputId={signal.id} />
                ) : null}
              </div>
            </div>

            {painSignal ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm font-medium leading-relaxed text-zinc-800 dark:text-zinc-100">
                    {painSignal.pain}
                  </p>
                  <div className="shrink-0">
                    {painSignal.icpGeneratedAt ? (
                      <span className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 dark:border-violet-500/30 dark:bg-violet-950/40 dark:text-violet-300">
                        ICP generated
                      </span>
                    ) : (
                      <GenerateICPButton painSignalId={painSignal.id} />
                    )}
                  </div>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-300">Urgency</dt>
                    <dd className="capitalize">{painSignal.urgency ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-300">Team</dt>
                    <dd>{painSignal.affectedTeam ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-300">Possible ICP</dt>
                    <dd>{painSignal.possibleIcp ?? "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-zinc-600 dark:text-zinc-300">Outreach Angle</dt>
                    <dd>{painSignal.outreachAngle ?? "Unknown"}</dd>
                  </div>
                </dl>
                {painSignal.icpGeneratedAt ? (
                  <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      ICP
                    </h3>
                    <dl className="mt-2 grid grid-cols-1 gap-2 text-xs text-zinc-500 dark:text-zinc-400 sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                          Target Titles
                        </dt>
                        <dd>{targetTitles.length ? targetTitles.join(", ") : "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                          Industry
                        </dt>
                        <dd>{painSignal.industry ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                          Company Size
                        </dt>
                        <dd>{painSignal.companySize ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">Buyer</dt>
                        <dd>{painSignal.buyer ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                          Budget Owner
                        </dt>
                        <dd>{painSignal.budgetOwner ?? "Unknown"}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                          Trigger Event
                        </dt>
                        <dd>{painSignal.triggerEvent ?? "Unknown"}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="font-medium text-zinc-600 dark:text-zinc-300">
                          Refined Outreach Angle
                        </dt>
                        <dd>{painSignal.outreachAngleRefined ?? "Unknown"}</dd>
                      </div>
                    </dl>
                  </div>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
