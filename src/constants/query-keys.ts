export const queryKeys = {
  session: ["auth", "session"] as const,
  currentUser: ["users", "me"] as const,
  currentElection: ["elections", "current"] as const,
  candidates: (electionId: string) =>
    ["elections", electionId, "candidates"] as const,
  eligibility: (electionId: string) =>
    ["elections", electionId, "eligibility"] as const,
  voteStatus: (electionId: string) =>
    ["elections", electionId, "vote-status"] as const,
  results: (electionId: string) =>
    ["elections", electionId, "results"] as const,
} as const;
