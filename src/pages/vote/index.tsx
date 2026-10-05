import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getApiError,
  useCastVote,
  useCurrentElection,
  useEligibility,
  useVoteStatus,
} from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";
import { ErrorState, LoadingState } from "@/components/async-state";
import { PageLayout } from "@/components/layout/page-layout";
import { NoElection } from "@/components/no-election";
import { Button } from "@/components/ui/button";
import { VoterGate } from "@/components/voter-gate";
import { cn } from "@/lib/utils";
import { isVotingTime } from "@/utils/date";

type VoteLocationState = { candidateId?: string } | null;

function Ballot() {
  const election = useCurrentElection();
  const location = useLocation();
  const navigate = useNavigate();
  const initial = (location.state as VoteLocationState)?.candidateId ?? "";
  const [selected, setSelected] = useState(initial);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const eligibility = useEligibility(election.data?.id, Boolean(election.data));
  const voteStatus = useVoteStatus(election.data?.id, Boolean(election.data));
  const castVote = useCastVote(election.data?.id ?? "");
  const canVoteNow =
    election.data?.status === "OPEN" &&
    isVotingTime(election.data.startsAt, election.data.endsAt, now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canVoteNow) dialogRef.current?.close();
  }, [canVoteNow]);

  useEffect(() => {
    if (
      eligibility.data?.reason === "ALREADY_VOTED" ||
      voteStatus.data?.hasVoted
    )
      navigate("/status", { replace: true });
  }, [eligibility.data, voteStatus.data, navigate]);

  if (election.isLoading || eligibility.isLoading || voteStatus.isLoading)
    return <LoadingState label="Preparing your ballot" />;
  if (election.isError)
    return <ErrorState retry={() => void election.refetch()} />;
  if (!election.data)
    return (
      <NoElection message="The ballot will become available when the next HIMTI Election opens." />
    );
  if (!canVoteNow)
    return (
      <ErrorState
        title="Voting is not open"
        message="Voting is not open at this time."
      />
    );
  if (eligibility.isError || voteStatus.isError)
    return (
      <ErrorState
        title="Voting access could not be checked"
        retry={() => {
          void eligibility.refetch();
          void voteStatus.refetch();
        }}
      />
    );
  if (!eligibility.data?.eligible) {
    return (
      <ErrorState
        title="You cannot vote in this election"
        message={
          eligibility.data?.reason === "NOT_SOCS"
            ? "Only BINUS School of Computer Science students and lecturers can vote. Your SoCS membership must be verified by an administrator."
            : eligibility.data?.reason === "ACCOUNT_INACTIVE"
              ? "Your account is inactive. Contact support to restore voting access."
              : eligibility.data?.reason === "PROFILE_INCOMPLETE"
                ? "Complete your membership profile before voting."
                : eligibility.data?.reason === "OUTLOOK_NOT_VERIFIED"
                  ? "Verify your BINUS Outlook email before voting."
                  : eligibility.data?.reason === "OUTLOOK_DOMAIN_NOT_ALLOWED"
                    ? "Voting requires a verified binus.ac.id or binus.edu email."
                    : "Voting is not available for your account at this time."
        }
      >
        <div className="mt-6 border-t border-border pt-6">
          <p className="text-sm leading-6 text-brand-slate">
            If you are a School of Computer Science student or lecturer but
            cannot vote, contact us on WhatsApp for help.
          </p>
          <h2 className="mt-5 text-sm font-semibold text-brand-navy">
            Contact Person
          </h2>
          <div
            className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-2"
            aria-label="WhatsApp support contacts"
          >
            {[
              ["Jad", "6285159401224"],
              ["Josh", "6285716303865"],
              ["Daffa", "6285887470135"],
            ].map(([name, number]) => (
              <a
                key={number}
                href={`https://wa.me/${number}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Contact ${name} on WhatsApp (opens in a new tab)`}
                className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm font-semibold text-brand-blue transition-colors hover:text-brand-navy hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="size-5 text-green-700"
                  aria-hidden="true"
                >
                  <path d="M20.52 3.48A11.85 11.85 0 0 0 12.06 0C5.47 0 .11 5.36.1 11.95c0 2.1.55 4.15 1.6 5.96L0 24l6.26-1.64a11.94 11.94 0 0 0 5.8 1.48h.01c6.59 0 11.95-5.36 11.96-11.95a11.87 11.87 0 0 0-3.51-8.41ZM12.07 21.82a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.9 9.9 0 0 1-1.52-5.26c0-5.48 4.46-9.94 9.95-9.94a9.88 9.88 0 0 1 7.03 2.92 9.87 9.87 0 0 1 2.91 7.04c0 5.48-4.46 9.95-10 9.95Zm5.46-7.45c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.8-1.49-1.78-1.66-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.46 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.71.63.72.23 1.37.2 1.88.12.57-.09 1.77-.73 2.02-1.44.25-.71.25-1.32.17-1.44-.07-.13-.27-.2-.57-.35Z" />
                </svg>
                {name}
              </a>
            ))}
          </div>
        </div>
      </ErrorState>
    );
  }

  const candidate = election.data.candidates.find(
    (item) => item.id === selected,
  );
  const submit = async () => {
    if (
      !canVoteNow ||
      !election.data ||
      !isVotingTime(election.data.startsAt, election.data.endsAt) ||
      !candidate ||
      !acknowledged
    )
      return;
    setError("");
    try {
      await castVote.mutateAsync(candidate.id);
      dialogRef.current?.close();
      navigate("/status", { replace: true });
    } catch (requestError) {
      const apiError = getApiError(requestError);
      if (apiError.code === "ALREADY_VOTED")
        return navigate("/status", { replace: true });
      const refreshedStatus = await voteStatus.refetch();
      if (refreshedStatus.data?.hasVoted)
        return navigate("/status", { replace: true });
      setError(apiError.message);
    }
  };

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 sm:space-y-8">
        <header>
          <p className="text-sm font-semibold text-brand-blue">
            {election.data.title}
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl">
            Choose one candidate
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-slate">
            Your selection is not submitted until you review and confirm it.
          </p>
        </header>
        <fieldset className="min-w-0 space-y-3">
          <legend className="sr-only">Election candidates</legend>
          {[...election.data.candidates]
            .sort((a, b) => a.ballotNumber - b.ballotNumber)
            .map((item) => (
              <label
                key={item.id}
                className={cn(
                  "relative flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:gap-5 sm:p-4",
                  selected === item.id
                    ? "border-brand-blue bg-brand-pale ring-1 ring-brand-blue"
                    : "border-border bg-white hover:border-brand-blue",
                )}
              >
                <span
                  className={cn(
                    "grid size-11 shrink-0 place-items-center rounded-full text-xl font-bold tabular-nums transition-colors sm:size-14 sm:text-2xl",
                    selected === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-brand-blue",
                  )}
                  aria-hidden="true"
                >
                  {String(item.ballotNumber).padStart(2, "0")}
                </span>
                <div className="size-14 shrink-0 overflow-hidden rounded-md bg-brand-pale sm:size-20">
                  <CandidateImage
                    src={item.photoUrl}
                    name={item.name}
                    className="bg-brand-pale bg-none text-brand-slate"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="break-words text-base font-bold text-brand-navy sm:text-xl">
                    {item.name}
                  </h2>
                  {item.biography ? (
                    <p className="mt-1 line-clamp-3 break-words text-sm leading-6 text-brand-slate">
                      {item.biography}
                    </p>
                  ) : null}
                </div>
                <input
                  type="radio"
                  name="candidate"
                  value={item.id}
                  aria-label={`Candidate #${String(item.ballotNumber).padStart(2, "0")}: ${item.name}`}
                  checked={selected === item.id}
                  onChange={() => setSelected(item.id)}
                  className="sr-only"
                />
              </label>
            ))}
        </fieldset>
        <div className="flex justify-end">
          <Button
            className="w-full px-7 py-4 text-base sm:w-auto"
            disabled={!canVoteNow || !candidate}
            onClick={() => {
              setAcknowledged(false);
              setError("");
              dialogRef.current?.showModal();
            }}
          >
            Cast your vote
          </Button>
        </div>
      </div>
      {createPortal(
        <dialog
          ref={dialogRef}
          aria-labelledby="confirm-title"
          className="fixed inset-0 m-auto h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border-0 bg-white p-0 shadow-2xl"
        >
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"
                aria-hidden="true"
              >
                <AlertTriangle className="size-5" />
              </span>
              <h2
                id="confirm-title"
                className="text-xl font-bold text-brand-navy sm:text-2xl"
              >
                Confirm your final vote
              </h2>
            </div>
            {candidate ? (
              <div className="mt-5 flex items-center gap-4 rounded-lg bg-brand-pale p-4">
                <div className="size-16 overflow-hidden rounded-lg">
                  <CandidateImage
                    src={candidate.photoUrl}
                    name={candidate.name}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-blue">
                    Candidate #{String(candidate.ballotNumber).padStart(2, "0")}
                  </p>
                  <p className="mt-1 font-bold text-brand-navy">
                    {candidate.name}
                  </p>
                </div>
              </div>
            ) : null}
            <label className="relative mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(event) => setAcknowledged(event.target.checked)}
                className="peer mt-1 size-5 shrink-0 cursor-pointer appearance-none rounded border border-border bg-white text-white checked:border-primary checked:bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Check
                className="pointer-events-none absolute ml-0.5 mt-1.5 size-4 stroke-[3] text-white opacity-0 peer-checked:opacity-100"
                aria-hidden="true"
              />
              <span className="text-sm leading-6 text-brand-slate">
                I understand that this vote is final and cannot be changed.
              </span>
            </label>
            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                disabled={castVote.isPending}
                onClick={() => dialogRef.current?.close()}
              >
                Go back
              </Button>
              <Button
                disabled={!canVoteNow || !acknowledged || castVote.isPending}
                onClick={() => void submit()}
              >
                <ShieldCheck className="size-4" />
                {castVote.isPending ? "Submitting..." : "Submit final vote"}
              </Button>
            </div>
          </div>
        </dialog>,
        document.body,
      )}
    </>
  );
}

export default function VotePage() {
  return (
    <PageLayout>
      <VoterGate>
        <Ballot />
      </VoterGate>
    </PageLayout>
  );
}
