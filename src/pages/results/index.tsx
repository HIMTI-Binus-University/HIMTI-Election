import { AlertCircle, Award, BarChart3, Clock3 } from "lucide-react";
import { useCurrentElection, useResults } from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";
import { LoadingState } from "@/components/async-state";
import { PageLayout } from "@/components/layout/page-layout";
import { NoElection } from "@/components/no-election";
import { Button } from "@/components/ui/button";
import { ResultsReveal } from "./reveal";

function ResultsNotice({
  title,
  message,
  error = false,
  retry,
}: {
  title: string;
  message: string;
  error?: boolean;
  retry?: () => void;
}) {
  const Icon = error ? AlertCircle : Clock3;
  return (
    <section
      role={error ? "alert" : undefined}
      className="mx-auto max-w-6xl rounded-xl border border-border bg-white px-6 py-9 shadow-brand sm:px-10 sm:py-12"
    >
      <Icon className="size-8 text-brand-blue" aria-hidden="true" />
      <h1 className="mt-5 break-words text-3xl font-bold leading-tight tracking-tight text-brand-navy sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-brand-slate">
        {message}
      </p>
      {retry && (
        <Button className="mt-6" onClick={retry}>
          Try again
        </Button>
      )}
    </section>
  );
}

export default function ResultsPage() {
  const election = useCurrentElection();
  const results = useResults(election.data?.id);
  if (
    election.isLoading ||
    (election.data?.status === "PUBLISHED" && results.isLoading)
  )
    return (
      <PageLayout>
        <LoadingState label="Loading election results" />
      </PageLayout>
    );
  if (election.isError)
    return (
      <PageLayout>
        <ResultsNotice
          error
          title="We could not load this page"
          message="Check your connection and try again."
          retry={() => void election.refetch()}
        />
      </PageLayout>
    );
  if (!election.data)
    return (
      <PageLayout>
        <NoElection message="Results will appear here after the next HIMTI Election concludes and its tally is published." />
      </PageLayout>
    );
  if (election.data.status !== "PUBLISHED")
    return (
      <PageLayout>
        <ResultsNotice
          title="Results are not published yet"
          message="Candidate totals will appear here when the election results are published."
        />
      </PageLayout>
    );
  if (results.isError)
    return (
      <PageLayout>
        <ResultsNotice
          error
          title="We could not load the results"
          message="The results could not be retrieved. Check your connection and try again."
          retry={() => void results.refetch()}
        />
      </PageLayout>
    );
  if (!results.data?.valid)
    return (
      <PageLayout>
        <ResultsNotice
          error
          title="Results are under review"
          message="The tally did not pass its integrity checks and cannot be displayed."
        />
      </PageLayout>
    );

  const currentElection = election.data;
  const data = results.data;
  const ordered = [...data.results].sort(
    (a, b) =>
      b.votes - a.votes ||
      a.candidate.ballotNumber - b.candidate.ballotNumber ||
      a.candidate.id.localeCompare(b.candidate.id),
  );
  const winner =
    data.ballotCount > 0 && !data.isTie
      ? ordered.find((item) => item.candidate.id === data.winnerCandidateId)
      : undefined;
  const leaders =
    data.ballotCount > 0 && data.isTie && (ordered[0]?.votes ?? 0) > 0
      ? ordered.filter((item) => item.votes === ordered[0].votes)
      : [];

  return (
    <PageLayout>
      <ResultsReveal electionId={currentElection.id} data={data}>
        {(replayButton) => (
          <div className="page-reveal mx-auto max-w-6xl space-y-9 sm:space-y-12">
            <header className="rounded-xl border border-brand-blue/20 bg-brand-pale px-6 py-9 sm:px-10 sm:py-12">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">
                <BarChart3 className="size-4" aria-hidden="true" />
                Results published
              </p>
              <h1
                data-results-heading
                tabIndex={-1}
                className="mt-3 max-w-4xl break-words text-3xl font-bold leading-tight tracking-tight text-brand-navy [text-wrap:balance] sm:text-5xl"
              >
                {currentElection.title}
              </h1>
              <div className="mt-6">{replayButton}</div>
            </header>

            {winner ? (
              <section
                aria-labelledby="winner-name"
                className="grid overflow-hidden rounded-xl border border-border bg-white shadow-brand md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
              >
                <div className="aspect-[4/3] overflow-hidden bg-brand-pale md:aspect-auto md:min-h-80">
                  <CandidateImage
                    src={winner.candidate.photoUrl}
                    name={winner.candidate.name}
                    className="bg-brand-pale bg-none text-brand-slate"
                  />
                </div>
                <div className="flex min-w-0 flex-col justify-center p-6 sm:p-9">
                  <p className="inline-flex items-center gap-2 text-base font-semibold text-brand-blue">
                    <Award className="size-5" aria-hidden="true" />
                    Election winner
                  </p>
                  <h2
                    id="winner-name"
                    className="mt-4 break-words text-3xl font-bold tracking-tight text-brand-navy [text-wrap:balance] sm:text-4xl"
                  >
                    {winner.candidate.name}
                  </h2>
                  <p className="mt-3 text-sm font-semibold text-brand-blue">
                    Candidate #
                    {String(winner.candidate.ballotNumber).padStart(2, "0")}
                  </p>
                  <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-6">
                    <div>
                      <dt className="text-sm text-brand-slate">Votes</dt>
                      <dd className="mt-1 text-3xl font-bold tabular-nums text-brand-navy">
                        {winner.votes.toLocaleString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-brand-slate">Ballot share</dt>
                      <dd className="mt-1 text-3xl font-bold tabular-nums text-brand-navy">
                        {((winner.votes / data.ballotCount) * 100).toFixed(1)}%
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>
            ) : leaders.length > 1 ? (
              <section
                aria-labelledby="tied-leaders"
                className="rounded-xl border border-border bg-white p-6 shadow-brand sm:p-9"
              >
                <h2
                  id="tied-leaders"
                  className="text-2xl font-bold text-brand-navy sm:text-3xl"
                >
                  Tied leaders
                </h2>
                <p className="mt-3 text-base leading-7 text-brand-slate">
                  These candidates received the same highest vote total. No
                  single winner was determined.
                </p>
                <ul
                  className={`mt-7 grid gap-8 sm:grid-cols-2 ${leaders.length > 2 ? "lg:grid-cols-3" : ""}`}
                >
                  {leaders.map(({ candidate, votes }) => (
                    <li key={candidate.id} className="min-w-0">
                      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-brand-pale">
                        <CandidateImage
                          src={candidate.photoUrl}
                          name={candidate.name}
                          className="bg-brand-pale bg-none text-brand-slate"
                        />
                      </div>
                      <p className="mt-5 text-sm font-semibold text-brand-blue">
                        Candidate #
                        {String(candidate.ballotNumber).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 break-words text-xl font-bold text-brand-navy">
                        {candidate.name}
                      </h3>
                      <p className="mt-3 font-semibold tabular-nums text-brand-navy">
                        {votes.toLocaleString()} votes
                      </p>
                      <p className="mt-1 text-sm tabular-nums text-brand-slate">
                        {((votes / data.ballotCount) * 100).toFixed(1)}% of
                        ballots
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section
                aria-labelledby="results-outcome"
                className="rounded-xl border border-border bg-white p-6 shadow-brand sm:p-9"
              >
                <h2
                  id="results-outcome"
                  className="text-2xl font-bold text-brand-navy sm:text-3xl"
                >
                  {data.ballotCount === 0
                    ? "No votes were recorded"
                    : "No winner was determined"}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-brand-slate">
                  {data.ballotCount === 0
                    ? "The published tally contains no ballots, so there is no election winner."
                    : "The published tally does not identify a single winner. See the candidate totals below."}
                </p>
              </section>
            )}

            <section
              aria-labelledby="vote-breakdown"
              className="rounded-xl border border-border bg-white p-6 shadow-brand sm:p-9"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2
                  id="vote-breakdown"
                  className="text-2xl font-bold text-brand-navy sm:text-3xl"
                >
                  Vote breakdown
                </h2>
                <p className="text-sm font-semibold tabular-nums text-brand-slate">
                  {data.ballotCount.toLocaleString()}{" "}
                  {data.ballotCount === 1 ? "ballot" : "ballots"}
                </p>
              </div>
              <p className="mt-3 text-sm leading-6 text-brand-slate">
                Ranked by votes. Percentages show each candidate’s share of all
                ballots.
              </p>
              {ordered.length > 0 ? (
                <ol className="mt-7 divide-y divide-border">
                  {ordered.map(({ candidate, votes }) => {
                    const percentage = data.ballotCount
                      ? (votes / data.ballotCount) * 100
                      : 0;
                    return (
                      <li
                        key={candidate.id}
                        className="py-6 first:pt-0 last:pb-0"
                      >
                        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_7rem_6rem]">
                          <div className="col-span-2 min-w-0 sm:col-span-1">
                            <p className="text-sm font-semibold text-brand-blue">
                              Candidate #
                              {String(candidate.ballotNumber).padStart(2, "0")}
                            </p>
                            <h3 className="mt-1 break-words text-lg font-bold text-brand-navy">
                              {candidate.name}
                            </h3>
                          </div>
                          <p className="font-semibold tabular-nums text-brand-navy sm:text-right">
                            {votes.toLocaleString()}{" "}
                            <span className="text-sm font-normal text-brand-slate">
                              votes
                            </span>
                          </p>
                          <p className="text-right font-semibold tabular-nums text-brand-navy">
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                        <div
                          className="mt-3 h-2 overflow-hidden rounded-full bg-brand-pale"
                          role="progressbar"
                          aria-label={`${candidate.name}: ${votes} votes`}
                          aria-valuemin={0}
                          aria-valuemax={Math.max(1, data.ballotCount)}
                          aria-valuenow={votes}
                          aria-valuetext={`${votes} votes, ${percentage.toFixed(1)}% of ballots`}
                        >
                          <div
                            className="h-full rounded-full bg-brand-blue"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="mt-7 text-base text-brand-slate">
                  No candidate totals are available in this tally.
                </p>
              )}
            </section>
          </div>
        )}
      </ResultsReveal>
    </PageLayout>
  );
}
