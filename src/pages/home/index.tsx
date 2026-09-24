import { useEffect, useState } from "react";
import { ArrowRight, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { useCurrentElection } from "@/api/elections";
import { ErrorState, LoadingState } from "@/components/async-state";
import { CandidateImage } from "@/components/candidate-image";
import { ElectionCountdown } from "@/components/countdown";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { formatElectionDate } from "@/utils/date";

export default function HomePage() {
  const election = useCurrentElection();
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
        <section className="mx-auto max-w-2xl rounded-xl border border-border bg-white p-8">
          <h1 className="text-2xl font-bold text-brand-navy">
            No election is active
          </h1>
          <p className="mt-3 text-brand-slate">
            The next HIMTI election will appear here when it is ready.
          </p>
        </section>
      </PageLayout>
    );

  const data = election.data;
  const beforeStart = now < new Date(data.startsAt).getTime();
  const ended =
    data.status === "CLOSED" ||
    data.status === "PUBLISHED" ||
    now >= new Date(data.endsAt).getTime();
  const canVote = data.status === "OPEN" && !beforeStart && !ended;
  const status =
    data.status === "PUBLISHED"
      ? "Results published"
      : ended
        ? "Voting has ended"
        : canVote
          ? "Voting is open"
          : "Voting has not opened";
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
          className="rounded-xl border border-brand-blue/20 bg-brand-pale p-6 sm:p-8 lg:p-10"
        >
          <p className="text-sm font-semibold text-brand-blue" role="status">
            {status}
          </p>
          <h1
            id="election-title"
            className="mt-3 max-w-4xl break-words text-4xl font-bold leading-tight tracking-tight text-brand-navy [text-wrap:balance] sm:text-5xl"
          >
            {data.title}
          </h1>
          {data.description && (
            <p className="mt-4 whitespace-pre-line break-words text-base leading-7 text-brand-slate">
              {data.description}
            </p>
          )}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {canVote ? (
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
            <Button asChild variant="outline">
              <Link to="/candidates">
                Explore candidates
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
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
          className="rounded-xl border border-border bg-white px-5 py-6 sm:p-8"
        >
          <h2
            id="election-schedule"
            className="text-2xl font-bold text-brand-navy"
          >
            Election Schedule
          </h2>
          <p className="mt-1 text-sm text-brand-slate">
            All times in WIB (Jakarta).
          </p>
          <ol
            aria-label="Election timeline"
            className="mt-7 flex flex-col sm:flex-row"
          >
            {milestones.map(({ label, at }, index) => {
              const passed = new Date(at).getTime() <= now;
              const segmentPassed =
                index < milestones.length - 1 &&
                new Date(milestones[index + 1].at).getTime() <= now;
              return (
                <li
                  key={label}
                  className="group relative min-w-0 flex-1 pb-6 pl-6 last:pb-0 sm:pb-0 sm:pl-0 sm:pr-6 sm:pt-6 sm:last:pr-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute bottom-0 left-1 top-1 w-px group-last:hidden sm:bottom-auto sm:h-px sm:w-full ${segmentPassed ? "bg-brand-blue" : "bg-border"}`}
                  />
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 size-[9px] rounded-full border-2 border-brand-blue ${passed ? "bg-brand-blue" : "bg-white"}`}
                  />
                  <h3 className="text-sm font-semibold text-brand-navy">
                    {label}
                    {passed && (
                      <span className="ml-2 text-xs font-medium text-brand-blue">
                        Passed
                      </span>
                    )}
                  </h3>
                  <time
                    dateTime={at}
                    className="mt-2 block text-sm leading-6 text-brand-slate"
                  >
                    {formatElectionDate(at)}
                  </time>
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
            <div
              className={`mt-6 grid gap-5 md:grid-cols-2 ${data.candidates.length >= 3 ? "lg:grid-cols-3" : ""}`}
            >
              {data.candidates
                .slice()
                .sort((a, b) => a.ballotNumber - b.ballotNumber)
                .map((candidate) => (
                  <article
                    key={candidate.id}
                    className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-white"
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
