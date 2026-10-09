import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import App from "@/App";
import { signInWithGoogle } from "@/api/auth";
import type { ElectionStatus } from "@/api/elections";

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
  videoUrl: "https://www.youtube.com/watch?v=sample" as string | null,
  workPrograms: ["Program One"],
  experiences: ["Organization experience"],
  isActive: true,
};

const election = {
  id: "election-1",
  slug: "himti-election",
  title: "HIMTI Election",
  description: "Make your choice.",
  status: "OPEN" as ElectionStatus,
  startsAt: "2020-01-01T00:00:00.000Z",
  endsAt: "2099-01-01T00:00:00.000Z",
  debateAt: "2098-12-20T12:00:00.000Z",
  secondDebateAt: null,
  closedAt: null,
  publishedAt: null,
  createdAt: "2020-01-01T00:00:00.000Z",
  updatedAt: null,
  candidates: [candidate],
};

let currentElection: typeof election | null = election;

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

let signedIn = true;
vi.mock("@/api/auth", () => ({
  useSession: () => ({
    data: signedIn ? { user: { id: "user-1" } } : null,
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
  getReturnPath: () => "/vote",
}));

vi.mock("@/api/elections", () => ({
  useCurrentElection: () => ({
    data: currentElection,
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

test("auth errors retry in election without exposing raw error text", async () => {
  vi.mocked(signInWithGoogle).mockRejectedValueOnce(new Error("offline"));
  renderAt("/auth/error?error=state_mismatch&error_description=untrusted");
  expect(screen.queryByText("untrusted")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute(
    "href",
    "/",
  );
  await userEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(signInWithGoogle).toHaveBeenCalledWith("/vote");
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not start sign-in",
  );
  expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
});

beforeEach(() => {
  signedIn = true;
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  castVote.mockReset();
  castVote.mockResolvedValue({
    receiptCode: "EL-SAMPLE",
    votedAt: "2026-01-01T00:00:00.000Z",
  });
  voteStatus = { hasVoted: false, receiptCode: null, votedAt: null };
  election.status = "OPEN";
  currentElection = election;
  publishedResults = null;
  sessionStorage.clear();
});

test("signed-out users can open voting from home even after voting ends", () => {
  signedIn = false;
  currentElection = { ...election, status: "PUBLISHED" };
  renderAt("/");
  expect(screen.getByRole("link", { name: "Cast your vote" })).toHaveAttribute(
    "href",
    "/vote",
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

test("home orders milestones and keeps voting actions synchronized with the window", () => {
  currentElection = {
    ...election,
    startsAt: "2026-01-01T00:00:02.000Z",
    endsAt: "2026-01-01T00:00:04.000Z",
    debateAt: "2026-01-01T00:00:06.000Z",
    secondDebateAt: "2026-01-01T00:00:03.000Z",
    candidates: [
      candidate,
      {
        ...candidate,
        id: "candidate-2",
        ballotNumber: 2,
        name: "Candidate Two",
      },
      {
        ...candidate,
        id: "candidate-3",
        ballotNumber: 3,
        name: "Candidate Three",
      },
    ],
  };
  renderAt("/");
  const timeline = screen.getByRole("list", { name: "Election timeline" });
  expect(
    Array.from(timeline.querySelectorAll("h3"), (item) => item.textContent),
  ).toEqual(["Voting opens", "Debate 2", "Voting closes", "Debate 1"]);
  expect(
    screen.getByRole("link", { name: "View Candidate Three's profile" }),
  ).toHaveAttribute("href", "/candidates?candidate=candidate-3");
  expect(screen.getByRole("button", { name: "Cast your vote" })).toBeDisabled();
  expect(
    screen.getByRole("link", { name: "Explore candidates" }),
  ).toHaveAttribute("href", "/candidates");
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByRole("link", { name: "Cast your vote" })).toHaveAttribute(
    "href",
    "/vote",
  );
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByRole("button", { name: "Cast your vote" })).toBeDisabled();
  expect(
    screen.queryByRole("link", { name: "Cast your vote" }),
  ).not.toBeInTheDocument();
});

test("home shows a second-only debate and announcement only when both are absent", () => {
  currentElection = { ...election, debateAt: null, secondDebateAt: "2026-01-01T00:00:03.000Z" };
  renderAt("/");
  expect(screen.getByText("Debate 2")).toBeInTheDocument();
  expect(screen.queryByText("Debate schedule to be announced.")).not.toBeInTheDocument();
  cleanup();
  currentElection = { ...election, debateAt: null, secondDebateAt: null };
  renderAt("/");
  expect(screen.getByText("Debate schedule to be announced.")).toBeInTheDocument();
  expect(screen.queryByText("Debate 1")).not.toBeInTheDocument();
  expect(screen.queryByText("Debate 2")).not.toBeInTheDocument();
});

test("home confirms an existing vote after voting ends", () => {
  currentElection = { ...election, status: "PUBLISHED" };
  voteStatus = {
    hasVoted: true,
    receiptCode: "EL-PRIVATE-RECEIPT",
    votedAt: "2026-01-01T00:00:00.000Z",
  };
  renderAt("/");
  expect(
    screen.getByRole("button", { name: "You already voted" }),
  ).toBeDisabled();
  expect(
    screen.queryByRole("link", { name: "Cast your vote" }),
  ).not.toBeInTheDocument();
});

test("candidate selection updates the profile, video, and vote target", async () => {
  currentElection = {
    ...election,
    candidates: [
      candidate,
      {
        ...candidate,
        id: "candidate-2",
        ballotNumber: 2,
        name: "Candidate Two",
        videoUrl: null,
        workPrograms: ["Second candidate program"],
        vision: "Second candidate vision",
      },
    ],
  };
  renderAt("/candidates");
  expect(screen.getByTitle("Candidate One campaign video")).toHaveAttribute(
    "src",
    "https://www.youtube.com/embed/sample",
  );
  await userEvent.click(
    screen.getByRole("button", { name: /Candidate #02 Candidate Two/ }),
  );
  const profile = screen.getByRole("article", {
    name: "Candidate Two profile",
  });
  expect(profile).toHaveTextContent("Second candidate vision");
  expect(profile).toHaveTextContent("Second candidate program");
  expect(
    screen.queryByTitle("Candidate One campaign video"),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText("Candidate video will be available soon"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Vote for this candidate" }),
  ).toHaveAttribute("href", "/vote");
  expect(window.location.search).toBe("?candidate=candidate-2");
});

test.each(["/candidates", "/candidates/candidate-1"])(
  "shows a recorded vote after voting closes at %s",
  (path) => {
    currentElection = { ...election, status: "PUBLISHED" };
    voteStatus = {
      hasVoted: true,
      receiptCode: "EL-PRIVATE-RECEIPT",
      votedAt: "2026-01-01T00:00:00.000Z",
    };
    renderAt(path);
    expect(
      screen.getByRole("button", { name: "You already voted" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("link", { name: "Vote for this candidate" }),
    ).not.toBeInTheDocument();
  },
);

test("candidate programs stay isolated when each candidate repeats a program", async () => {
  currentElection = {
    ...election,
    candidates: [1, 2, 3].map((number) => ({
      ...candidate,
      id: `candidate-${number}`,
      ballotNumber: number,
      name: `Candidate ${number}`,
      workPrograms: Array(3).fill(`Program ${number}`),
      experiences: Array(3).fill(`Experience ${number}`),
    })),
  };
  renderAt("/candidates");
  for (const number of [2, 3, 1, 2, 3, 1]) {
    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`Candidate #0${number} Candidate ${number}`),
      }),
    );
    const profile = screen.getByRole("article", {
      name: `Candidate ${number} profile`,
    });
    expect(
      Array.from(
        profile.querySelectorAll("#work-programs + ol li"),
        (item) => item.textContent,
      ),
    ).toEqual([
      `01Program ${number}`,
      `02Program ${number}`,
      `03Program ${number}`,
    ]);
    expect(
      Array.from(profile.querySelectorAll("ul li"), (item) => item.textContent),
    ).toEqual([
      `Experience ${number}`,
      `Experience ${number}`,
      `Experience ${number}`,
    ]);
  }
});

test("shows an empty state when candidates have no active election", () => {
  currentElection = null;
  renderAt("/candidates");
  expect(
    screen.getByRole("heading", { name: "No election is active" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("We could not load this page"),
  ).not.toBeInTheDocument();
});

test.each(["/vote", "/results"])(
  "shows an empty state at %s when no election is active",
  (path) => {
    currentElection = null;
    renderAt(path);
    expect(
      screen.getByRole("heading", { name: "No election is active" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("We could not load this page"),
    ).not.toBeInTheDocument();
  },
);

test("requires review and final acknowledgment before submitting", async () => {
  const user = userEvent.setup();
  renderAt("/vote");

  await user.click(
    screen.getByRole("radio", { name: /candidate #01: candidate one/i }),
  );
  await user.click(screen.getByRole("button", { name: "Cast your vote" }));

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

test("closes an open confirmation when the voting deadline passes", async () => {
  currentElection = { ...election, endsAt: "2026-01-01T00:00:01.000Z" };
  renderAt("/vote");
  fireEvent.click(
    screen.getByRole("radio", { name: /candidate #01: candidate one/i }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Cast your vote" }));
  fireEvent.click(screen.getByRole("checkbox", { name: /vote is final/i }));
  expect(
    screen.getByRole("button", { name: /submit final vote/i }),
  ).toBeEnabled();
  await act(async () => vi.advanceTimersByTime(1000));
  expect(
    screen.getByRole("heading", { name: "Voting is not open" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /submit final vote/i }),
  ).not.toBeInTheDocument();
  expect(castVote).not.toHaveBeenCalled();
});

test("reports rejected clipboard writes without claiming success", async () => {
  voteStatus = {
    hasVoted: true,
    receiptCode: "EL-PRIVATE-RECEIPT",
    votedAt: null,
  };
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
  });
  renderAt("/status");
  fireEvent.click(screen.getByRole("button", { name: "Copy receipt code" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Please copy it manually",
  );
  expect(screen.queryByText("Receipt copied")).not.toBeInTheDocument();
});
test("explains that closed election results are not published yet", () => {
  currentElection = { ...election, status: "CLOSED" };
  renderAt("/results");
  expect(
    screen.getByRole("heading", { name: "Results are not published yet" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      "Candidate totals will appear here when the election results are published.",
    ),
  ).toBeInTheDocument();
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
    screen.getByRole("button", { name: "Begin reveal" }),
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

test("skipping an active reveal keeps the final results visible", async () => {
  vi.useFakeTimers();
  election.status = "PUBLISHED";
  publishedResults = {
    participationCount: 8,
    ballotCount: 8,
    valid: true,
    winnerCandidateId: candidate.id,
    isTie: false,
    results: [{ candidate, votes: 8 }],
  };
  renderAt("/results");

  fireEvent.click(screen.getByRole("button", { name: "Begin reveal" }));
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Skip" }));
  expect(
    screen.getByRole("progressbar", { name: "Candidate One: 8 votes" }),
  ).toHaveAttribute("aria-valuenow", "8");

  await act(() => vi.advanceTimersByTimeAsync(30_000));
  expect(
    screen.getByRole("progressbar", { name: "Candidate One: 8 votes" }),
  ).toHaveAttribute("aria-valuenow", "8");
  expect(
    screen.queryByRole("button", { name: "Skip" }),
  ).not.toBeInTheDocument();
});
