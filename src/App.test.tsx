import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "@/App";

const castVote = vi.fn();

const candidate = {
  id: "candidate-1",
  electionId: "election-1",
  ballotNumber: 1,
  name: "Candidate One",
  photoUrl: null,
  biography: "Candidate biography",
  slogan: "One family, one goal",
  vision: "A clear vision for HIMTI.",
  mission: "A practical mission for HIMTI.",
  videoUrl: "https://www.youtube.com/watch?v=sample",
  workPrograms: ["Program One"],
  experiences: ["Organization experience"],
  position: 0,
  isActive: true,
};

const election = {
  id: "election-1",
  slug: "himti-election",
  title: "HIMTI Election",
  description: "Make your choice.",
  status: "OPEN" as "OPEN" | "PUBLISHED",
  startsAt: "2020-01-01T00:00:00.000Z",
  endsAt: "2099-01-01T00:00:00.000Z",
  debateAt: "2098-12-20T12:00:00.000Z",
  openedAt: "2020-01-01T00:00:00.000Z",
  closedAt: null,
  publishedAt: null,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: null,
  candidates: [candidate],
};

let voteStatus = {
  hasVoted: false,
  receiptCode: null as string | null,
  votedAt: null as string | null,
};

let publishedResults: null | {
  participationCount: number;
  ballotCount: number;
  valid: boolean;
  winnerCandidateId: string | null;
  isTie: boolean;
  results: Array<{ candidate: typeof candidate; votes: number }>;
} = null;

vi.mock("@/api/auth", () => ({
  useSession: () => ({
    data: { user: { id: "user-1" } },
    isLoading: false,
    isError: false,
  }),
  useCurrentUser: () => ({
    data: {
      id: "user-1",
      registrationCompleted: true,
      institutionType: "BINUS",
      outlookEmailVerified: true,
    },
    isLoading: false,
    isError: false,
  }),
  useSignOut: () => vi.fn(),
  needsProfileCompletion: () => false,
  signInWithGoogle: vi.fn(),
  consumeReturnPath: () => "/",
}));

vi.mock("@/api/elections", () => ({
  useCurrentElection: () => ({
    data: election,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useEligibility: () => ({
    data: { eligible: true, reason: null, hasVoted: false },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useVoteStatus: () => ({
    data: voteStatus,
    isLoading: false,
    isError: false,
    refetch: vi.fn().mockResolvedValue({ data: voteStatus }),
  }),
  useCastVote: () => ({ mutateAsync: castVote, isPending: false }),
  useResults: () => ({
    data: publishedResults,
    isLoading: false,
    isError: !publishedResults,
  }),
  getApiError: () => ({ code: null, message: "Request failed" }),
}));

const renderAt = (path: string) => {
  window.history.pushState({}, "", path);
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>,
  );
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  castVote.mockReset();
  castVote.mockResolvedValue({
    receiptCode: "EL-SAMPLE",
    votedAt: "2026-01-01T00:00:00.000Z",
  });
  voteStatus = { hasVoted: false, receiptCode: null, votedAt: null };
  election.status = "OPEN";
  publishedResults = null;
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("renders the live election and candidate", () => {
  renderAt("/");
  expect(
    screen.getByRole("heading", { name: "HIMTI Election" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Candidate One" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Voting ends in")).toBeInTheDocument();
  expect(screen.getByText("Election Schedule")).toBeInTheDocument();
});

test("switches candidate content on the candidates page", async () => {
  renderAt("/candidates");
  expect(
    screen.getByRole("heading", { name: "Our Candidates" }),
  ).toBeInTheDocument();
  expect(screen.getByTitle("Candidate One campaign video")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/sample",
  );
  expect(screen.getByText("Program One")).toBeInTheDocument();
});

test("requires review and final acknowledgment before submitting", async () => {
  const user = userEvent.setup();
  renderAt("/vote");

  await user.click(
    screen.getByRole("radio", { name: /candidate 1 candidate one/i }),
  );
  await user.click(screen.getByRole("button", { name: "Review your vote" }));

  const submit = screen.getByRole("button", { name: /submit final vote/i });
  expect(submit).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: /vote is final/i }));
  expect(submit).toBeEnabled();
  await user.click(submit);

  expect(castVote).toHaveBeenCalledOnce();
  expect(castVote).toHaveBeenCalledWith("candidate-1");
});

test("receipt status never reveals the candidate choice", () => {
  voteStatus = {
    hasVoted: true,
    receiptCode: "EL-PRIVATE-RECEIPT",
    votedAt: "2026-01-01T00:00:00.000Z",
  };
  renderAt("/status");
  expect(screen.getByText("EL-PRIVATE-RECEIPT")).toBeInTheDocument();
  expect(screen.queryByText("Candidate One")).not.toBeInTheDocument();
});

test("offers and skips the published results ceremony", async () => {
  election.status = "PUBLISHED";
  publishedResults = {
    participationCount: 8,
    ballotCount: 8,
    valid: true,
    winnerCandidateId: candidate.id,
    isTie: false,
    results: [{ candidate, votes: 8 }],
  };
  const user = userEvent.setup();
  renderAt("/results");
  expect(
    screen.getByRole("heading", { name: "The results are here." }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "View full results" }));
  expect(
    screen.getByRole("heading", { name: "Vote breakdown" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("progressbar", { name: "Candidate One: 8 votes" }),
  ).toHaveAttribute("aria-valuenow", "8");
  expect(sessionStorage.getItem("results-reveal:election-1")).toBe("complete");
});
