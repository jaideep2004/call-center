export const DISPOSITION_OUTCOMES = [
  "sold",
  "not_interested",
  "no_answer",
  "dead_call",
  "dead_air",
  "follow_up",
  "disqualified",
] as const;

export const DISPOSITION_LABELS: Record<string, string> = {
  sold: "Sold",
  not_interested: "Not Interested",
  no_answer: "No Answer",
  dead_call: "Dead Call",
  dead_air: "Dead Air",
  follow_up: "Follow Up",
  disqualified: "Disqualified",
};

export const DISPOSITION_COLORS: Record<string, string> = {
  sold: "badge-success",
  not_interested: "badge-warning",
  no_answer: "badge",
  dead_call: "badge",
  dead_air: "badge",
  follow_up: "badge-info",
  disqualified: "badge-danger",
};

export const QUALIFIED_OUTCOMES = ["sold", "follow_up"] as const;

export function isQualifiedOutcome(outcome: string): boolean {
  return (QUALIFIED_OUTCOMES as readonly string[]).includes(outcome);
}

export function leadStatusForOutcome(outcome: string): string {
  if (outcome === "sold") return "converted";
  if (outcome === "follow_up") return "qualified";
  return "new";
}
