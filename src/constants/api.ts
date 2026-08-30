const election = (electionId: string) => `/elections/${electionId}`;

export const apiPaths = {
  session: "/auth/get-session",
  signIn: "/auth/sign-in/social",
  signOut: "/auth/sign-out",
  currentUser: "/user/me",
  currentElection: "/elections/current",
  candidates: (electionId: string) => `${election(electionId)}/candidates`,
  eligibility: (electionId: string) => `${election(electionId)}/eligibility`,
  voteStatus: (electionId: string) => `${election(electionId)}/my-vote-status`,
  vote: (electionId: string) => `${election(electionId)}/vote`,
  results: (electionId: string) => `${election(electionId)}/results`,
} as const;
