export const FINDING_STATUS = {
  Pending: "pending",
  Published: "published",
  Ignored: "ignored",
} as const;

export type FindingStatus = (typeof FINDING_STATUS)[keyof typeof FINDING_STATUS];

export const findingStatusValues = [
  FINDING_STATUS.Pending,
  FINDING_STATUS.Published,
  FINDING_STATUS.Ignored,
] as const;

// ---------------------------------------------------------------------------
// Transition rules
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<FindingStatus, readonly FindingStatus[]> = {
  [FINDING_STATUS.Pending]: [FINDING_STATUS.Published, FINDING_STATUS.Ignored],
  [FINDING_STATUS.Published]: [FINDING_STATUS.Pending],
  [FINDING_STATUS.Ignored]: [FINDING_STATUS.Pending],
};

export function isValidStatusTransition(from: FindingStatus, to: FindingStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}
