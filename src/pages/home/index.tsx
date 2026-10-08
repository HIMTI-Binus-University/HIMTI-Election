import { useEffect, useState } from "react";
import { ArrowRight, Check, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { useSession } from "@/api/auth";
import { useCurrentElection, useVoteStatus } from "@/api/elections";
import { ErrorState, LoadingState } from "@/components/async-state";
import { CandidateImage } from "@/components/candidate-image";
import { ElectionCountdown } from "@/components/countdown";
import { PageLayout } from "@/components/layout/page-layout";
import { NoElection } from "@/components/no-election";
import { Button } from "@/components/ui/button";
import { formatElectionDate } from "@/utils/date";

export default function HomePage() {
  const election = useCurrentElection();
  const session = useSession();
  const voteStatus = useVoteStatus(election.data?.id, Boolean(session.data));
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (election.isLoading)
    return (
      <PageLayout>
        <LoadingState />
      </PageLayout>
    );
  if (election.isError)
    return (
      <PageLayout>
        <ErrorState retry={() => void election.refetch()} />
      </PageLayout>
    );
  if (!election.data)
    return (
      <PageLayout>
        <NoElection message="The next HIMTI election will appear here when it is ready." />
      </PageLayout>
    );

  const data = election.data;
  const beforeStart = now < new Date(data.startsAt).getTime();
  const ended =
    data.status === "CLOSED" ||
    data.status === "PUBLISHED" ||
    now >= new Date(data.endsAt).getTime();
  const canVote = data.status === "OPEN" && !beforeStart && !ended;
  const countdownLabel = ended
    ? "Voting has ended"
    : beforeStart
      ? "Voting begins in"
      : canVote
        ? "Voting ends in"
        : "Voting has not opened";
  const countdownTarget = ended
    ? null
    : beforeStart
      ? data.startsAt
      : canVote
        ? data.endsAt
        : null;
  const milestones = [
    { label: "Voting opens", at: data.startsAt },
    ...(data.debateAt
      ? [{ label: "Candidate debate", at: data.debateAt }]
      : []),
    { label: "Voting closes", at: data.endsAt },
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl space-y-10 sm:space-y-14">
        <section
          aria-labelledby="election-title"
          className="election-hero px-2 py-12 text-center sm:px-10 sm:py-20"
        >
          <h1
            id="election-title"
            className="mx-auto max-w-5xl break-words text-5xl font-bold leading-tight tracking-tight text-brand-navy [text-wrap:balance] sm:text-6xl lg:text-7xl"
          >
            {data.title}
          </h1>
          {data.description && (
            <p className="mx-auto mt-6 max-w-3xl whitespace-pre-line break-words text-lg leading-8 text-brand-slate sm:text-xl sm:leading-9">
              {data.description}
            </p>
          )}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="outline">
              <Link to="/candidates">
                Explore candidates
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
            {!session.data ? (
              <Button asChild>
                <Link to="/vote">
                  <Vote className="size-4" aria-hidden="true" />
                  Cast your vote
                </Link>
              </Button>
            ) : !voteStatus.data ? (
              <Button disabled>
                <Vote className="size-4" aria-hidden="true" />
                {voteStatus.isError
                  ? "Vote status unavailable"
                  : "Checking vote status..."}
              </Button>
            ) : voteStatus.data?.hasVoted ? (
              <Button disabled>
                <Vote className="size-4" aria-hidden="true" />
                You already voted
              </Button>
            ) : canVote ? (
              <Button asChild>
                <Link to="/vote">
                  <Vote className="size-4" aria-hidden="true" />
                  Cast your vote
                </Link>
              </Button>
            ) : (
              <Button disabled>
                <Vote className="size-4" aria-hidden="true" />
                Cast your vote
              </Button>
            )}
            {data.status === "PUBLISHED" && (
              <Button asChild variant="outline">
                <Link to="/results">View results</Link>
              </Button>
            )}
          </div>
        </section>

        <ElectionCountdown
          target={countdownTarget}
          label={countdownLabel}
          now={now}
        />

        <section
          aria-labelledby="election-schedule"
          className="rounded-xl border border-border bg-white px-5 py-6 shadow-brand sm:p-8"
        >
          <h2
            id="election-schedule"
            className="text-2xl font-bold text-brand-navy"
          >
            Election Schedule
          </h2>
          <ol
            aria-label="Election timeline"
            className="mt-7 flex w-full flex-col sm:flex-row"
          >
            {milestones.map(({ label, at }) => {
              const passed = new Date(at).getTime() <= now;
              return (
                <li
                  key={label}
                  className="relative min-w-0 flex-1 pb-4 pl-8 sm:px-2 sm:pb-0 sm:pt-9 before:absolute before:bottom-0 before:left-2 before:top-0 before:w-px before:bg-border sm:before:inset-x-0 sm:before:top-2 sm:before:h-px sm:before:w-full"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 z-10 size-4 rounded-full border-2 sm:left-1/2 sm:-translate-x-1/2 ${passed ? "border-brand-blue bg-brand-blue" : "border-brand-blue bg-white"}`}
                  />
                  <div
                    className={`flex h-full flex-col items-center justify-center rounded-xl border p-5 text-center shadow-brand ${passed ? "border-brand-blue bg-brand-pale" : "border-border bg-white"}`}
                  >
                    <h3 className="text-base font-semibold text-brand-navy">
                      {label}
                    </h3>
                    <time
                      dateTime={at}
                      className="mt-2 block text-sm leading-6 text-brand-slate"
                    >
                      {formatElectionDate(at)}
                    </time>
                    {passed && (
                      <span className="mx-auto mt-3 flex w-fit items-center gap-1.5 rounded-full bg-brand-blue px-3 py-1 text-xs font-semibold text-white">
                        <Check className="size-3.5" aria-hidden="true" /> Completed
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {!data.debateAt && (
            <p className="mt-5 text-sm text-brand-slate">
              Debate schedule to be announced.
            </p>
          )}
        </section>

        <section aria-labelledby="candidates-heading">
          <h2
            id="candidates-heading"
            className="text-2xl font-bold text-brand-navy"
          >
            Meet the candidates
          </h2>
          <p className="mt-2 text-sm leading-6 text-brand-slate">
            Get to know their vision, then explore their full profiles.
          </p>
          {data.candidates.length === 0 ? (
            <p className="mt-6 text-brand-slate">
              Candidate profiles will appear here when they are available.
            </p>
          ) : (
            <div className="mt-6 flex flex-wrap justify-center gap-5">
              {data.candidates
                .slice()
                .sort((a, b) => a.ballotNumber - b.ballotNumber)
                .map((candidate) => (
                  <article
                    key={candidate.id}
                    className="election-card flex w-full max-w-sm min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white shadow-brand sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-brand-pale">
                      <CandidateImage
                        src={candidate.photoUrl}
                        name={candidate.name}
                        className="bg-brand-pale bg-none text-brand-slate"
                      />
                    </div>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <p className="text-sm font-semibold text-brand-blue">
                        Candidate #
                        {String(candidate.ballotNumber).padStart(2, "0")}
                      </p>
                      <h3 className="mt-1 break-words text-xl font-bold text-brand-navy">
                        {candidate.name}
                      </h3>
                      {candidate.slogan && (
                        <p className="mt-5 break-words text-base font-medium leading-6 text-brand-navy">
                          {candidate.slogan}
                        </p>
                      )}
                      <div className="mb-6 mt-5 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-brand-navy">
                            Vision
                          </h4>
                          <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-brand-slate">
                            {candidate.vision}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-brand-navy">
                            Mission
                          </h4>
                          <p className="mt-1 line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-brand-slate">
                            {candidate.mission}
                          </p>
                        </div>
                      </div>
                      <Link
                        to={`/candidates?candidate=${candidate.id}`}
                        aria-label={`View ${candidate.name}'s profile`}
                        className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-lg border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-pale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        View candidate{" "}
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>
      </div>
    </PageLayout>
  );
}
