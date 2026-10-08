import { ArrowLeft, Vote } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useSession } from "@/api/auth";
import { useCurrentElection, useVoteStatus } from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";
import { ErrorState, LoadingState } from "@/components/async-state";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { isVotingTime } from "@/utils/date";

export default function CandidatePage() {
  const { candidateId } = useParams();
  const election = useCurrentElection();
  const session = useSession();
  const voteStatus = useVoteStatus(election.data?.id, Boolean(session.data));
  if (election.isLoading)
    return (
      <PageLayout>
        <LoadingState label="Loading candidate" />
      </PageLayout>
    );
  const candidate = election.data?.candidates.find(
    (item) => item.id === candidateId,
  );
  if (election.isError || !candidate || !election.data)
    return (
      <PageLayout>
        <ErrorState
          title="Candidate not found"
          message="This candidate is not available in the current election."
        />
      </PageLayout>
    );
  const canVote =
    election.data.status === "OPEN" &&
    isVotingTime(election.data.startsAt, election.data.endsAt);
  return (
    <PageLayout>
      <article className="page-reveal mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-white bg-white shadow-brand lg:grid-cols-[0.85fr_1.15fr]">
        <div className="aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[36rem]">
          <CandidateImage src={candidate.photoUrl} name={candidate.name} />
        </div>
        <div className="p-6 sm:p-9">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 font-semibold text-brand-blue"
          >
            <ArrowLeft className="size-4" />
            Back to election
          </Link>
          <span className="mt-5 block text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">
            Candidate {candidate.ballotNumber}
          </span>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-brand-navy">
            {candidate.name}
          </h1>
          {candidate.biography ? (
            <p className="mt-4 leading-7 text-brand-slate">
              {candidate.biography}
            </p>
          ) : null}
          <section className="mt-8">
            <h2 className="text-lg font-bold text-brand-navy">Vision</h2>
            <p className="mt-2 whitespace-pre-line leading-7 text-brand-slate">
              {candidate.vision}
            </p>
          </section>
          <section className="mt-7">
            <h2 className="text-lg font-bold text-brand-navy">Mission</h2>
            <p className="mt-2 whitespace-pre-line leading-7 text-brand-slate">
              {candidate.mission}
            </p>
          </section>
          {candidate.workPrograms.length ? (
            <section className="mt-7">
              <h2 className="text-lg font-bold text-brand-navy">
                Work Programs
              </h2>
              <ol className="mt-3 list-decimal space-y-2 pl-5 leading-7 text-brand-slate">
                {candidate.workPrograms.map((program) => (
                  <li key={program}>{program}</li>
                ))}
              </ol>
            </section>
          ) : null}
          {candidate.experiences.length ? (
            <section className="mt-7">
              <h2 className="text-lg font-bold text-brand-navy">
                Organization Experience
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-brand-slate">
                {candidate.experiences.map((experience) => (
                  <li key={experience}>{experience}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {canVote || voteStatus.data?.hasVoted ? (
            session.data && !voteStatus.data ? (
              <Button disabled className="mt-8">
                {voteStatus.isError
                  ? "Vote status unavailable"
                  : "Checking vote status..."}
              </Button>
            ) : voteStatus.data?.hasVoted ? (
              <Button disabled className="mt-8">
                You already voted
              </Button>
            ) : (
              <Button asChild className="mt-8">
                <Link to="/vote" state={{ candidateId: candidate.id }}>
                  <Vote className="size-4" />
                  Vote for this candidate
                </Link>
              </Button>
            )
          ) : null}
        </div>
      </article>
    </PageLayout>
  );
}
