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
import { Button } from "@/components/ui/button";
import { VoterGate } from "@/components/voter-gate";
import { cn } from "@/lib/utils";

type VoteLocationState = { candidateId?: string } | null;

function Ballot() {
  const election = useCurrentElection();
  const location = useLocation();
  const navigate = useNavigate();
  const initial = (location.state as VoteLocationState)?.candidateId ?? "";
  const [selected, setSelected] = useState(initial);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const eligibility = useEligibility(election.data?.id, Boolean(election.data));
  const voteStatus = useVoteStatus(election.data?.id, Boolean(election.data));
  const castVote = useCastVote(election.data?.id ?? "");

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
      <section className="page-reveal mx-auto max-w-xl rounded-3xl border border-white bg-white p-8 text-center shadow-brand sm:p-11">
        <ShieldCheck
          className="mx-auto size-12 text-brand-blue"
          aria-hidden="true"
        />
        <h1 className="mt-5 text-3xl font-bold text-brand-navy">
          No election is active
        </h1>
        <p className="mt-3 text-sm leading-6 text-brand-slate">
          The ballot will become available when the next HIMTI Election opens.
        </p>
      </section>
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
    const messages: Record<string, string> = {
      ACCOUNT_INACTIVE: "Your HIMTI account is not active.",
      OUTLOOK_DOMAIN_NOT_ALLOWED:
        "This election requires an eligible BINUS Outlook account.",
      NOT_COMPUTER_SCIENCE:
        "Voting is available to Computer Science, Data Science, and Game Application and Technology students, and School of Computer Science lecturers.",
      ELECTION_NOT_OPEN: "Voting is not open at this time.",
    };
    return (
      <ErrorState
        title="You cannot vote in this election"
        message={
          messages[eligibility.data?.reason ?? ""] ??
          "Your profile is not eligible for this election."
        }
      />
    );
  }

  const candidate = election.data.candidates.find(
    (item) => item.id === selected,
  );
  const submit = async () => {
    if (!candidate || !acknowledged) return;
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
      <div className="mx-auto max-w-6xl space-y-9 sm:space-y-12">
        <header className="rounded-xl border border-brand-blue/20 bg-brand-pale px-6 py-9 sm:px-10 sm:py-12">
          <p className="text-sm font-semibold text-brand-blue">
            {election.data.title}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            Choose one candidate
          </h1>
          <p className="mt-4 text-base leading-7 text-brand-slate">
            Your selection is not submitted until you review and confirm it.
          </p>
        </header>
        <fieldset className="flex flex-wrap justify-center gap-4">
          <legend className="sr-only">Election candidates</legend>
          {[...election.data.candidates]
            .sort((a, b) => a.ballotNumber - b.ballotNumber)
            .map((item) => (
              <label
                key={item.id}
                className={cn(
                  "relative w-full max-w-sm cursor-pointer overflow-hidden rounded-xl border bg-white transition-colors focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]",
                  selected === item.id
                    ? "border-brand-blue ring-1 ring-brand-blue"
                    : "border-border hover:border-brand-blue",
                )}
              >
                <input
                  type="radio"
                  name="candidate"
                  value={item.id}
                  checked={selected === item.id}
                  onChange={() => setSelected(item.id)}
                  className="sr-only"
                />
                <div className="aspect-[4/3] overflow-hidden bg-brand-pale">
                  <CandidateImage
                    src={item.photoUrl}
                    name={item.name}
                    className="bg-brand-pale bg-none text-brand-slate"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-sm font-semibold text-brand-blue">
                        Candidate #{String(item.ballotNumber).padStart(2, "0")}
                      </span>
                      <h2 className="mt-1 break-words text-xl font-bold text-brand-navy">
                        {item.name}
                      </h2>
                    </div>
                    {selected === item.id ? (
                      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-blue text-white">
                        <Check className="size-4" />
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-brand-slate">
                    {item.vision}
                  </p>
                </div>
              </label>
            ))}
        </fieldset>
        <div className="flex flex-col gap-5 rounded-xl bg-brand-pale p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">
              Ready to review?
            </h2>
            <p className="mt-1 text-sm leading-6 text-brand-slate">
              Check your selection before submitting your final vote.
            </p>
          </div>
          <Button
            className="shrink-0 px-7 py-4 text-base"
            disabled={!selected}
            onClick={() => {
              setAcknowledged(false);
              setError("");
              dialogRef.current?.showModal();
            }}
          >
            Review your vote
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
                disabled={!acknowledged || castVote.isPending}
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
