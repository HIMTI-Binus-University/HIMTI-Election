import { AlertTriangle, Check, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    <div className="page-reveal mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">
          Official ballot
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
          Choose one candidate
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-brand-slate">
          Your selection is not submitted until you review and confirm it.
        </p>
      </div>
      <fieldset className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <legend className="sr-only">Election candidates</legend>
        {election.data.candidates.map((item) => (
          <label
            key={item.id}
            className={cn(
              "relative cursor-pointer overflow-hidden rounded-3xl border-2 bg-white shadow-sm transition focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
              selected === item.id
                ? "border-brand-blue bg-brand-pale/30 shadow-brand"
                : "border-transparent hover:border-brand-blue/25",
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
            <div className="aspect-[4/3]">
              <CandidateImage src={item.photoUrl} name={item.name} />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-blue">
                    Candidate {item.ballotNumber}
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-brand-navy">
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
      <div className="mt-8 flex justify-center">
        <Button
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
      <dialog
        ref={dialogRef}
        aria-labelledby="confirm-title"
        className="w-[calc(100%-2rem)] max-w-lg rounded-3xl border-0 bg-white p-0 shadow-2xl"
      >
        <div className="p-6 sm:p-8">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700">
            <AlertTriangle className="size-6" />
          </span>
          <h2
            id="confirm-title"
            className="mt-5 text-2xl font-bold text-brand-navy"
          >
            Confirm your final vote
          </h2>
          {candidate ? (
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-brand-pale p-4">
              <div className="size-16 overflow-hidden rounded-xl">
                <CandidateImage
                  src={candidate.photoUrl}
                  name={candidate.name}
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-blue">
                  Candidate {candidate.ballotNumber}
                </p>
                <p className="mt-1 font-bold text-brand-navy">
                  {candidate.name}
                </p>
              </div>
            </div>
          ) : null}
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-1 size-4 accent-[#004cb5]"
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
      </dialog>
    </div>
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
