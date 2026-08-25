import { Award, BarChart3, Clock3 } from "lucide-react";
import { useCurrentElection, useResults } from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";
import { ErrorState, LoadingState } from "@/components/async-state";
import { PageLayout } from "@/components/layout/page-layout";

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
  if (election.isError || !election.data)
    return (
      <PageLayout>
        <ErrorState retry={() => void election.refetch()} />
      </PageLayout>
    );
  if (election.data.status !== "PUBLISHED" || results.isError)
    return (
      <PageLayout>
        <section className="page-reveal mx-auto max-w-xl rounded-3xl border border-white bg-white p-8 text-center shadow-brand sm:p-11">
          <Clock3 className="mx-auto size-12 text-brand-blue" />
          <h1 className="mt-5 text-3xl font-bold text-brand-navy">
            Results are not published yet
          </h1>
          <p className="mt-3 text-sm leading-6 text-brand-slate">
            Candidate totals will appear here after voting closes and the
            results are verified.
          </p>
        </section>
      </PageLayout>
    );
  if (!results.data?.valid)
    return (
      <PageLayout>
        <ErrorState
          title="Results are under review"
          message="The tally did not pass its integrity checks and cannot be displayed."
        />
      </PageLayout>
    );
  const data = results.data;
  const ordered = [...data.results].sort((a, b) => b.votes - a.votes);
  return (
    <PageLayout>
      <div className="page-reveal mx-auto max-w-5xl">
        <header className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-pale px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-brand-blue">
            <BarChart3 className="size-4" />
            Official results
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
            {election.data.title}
          </h1>
          <p className="mt-3 text-brand-slate">
            {data.isTie
              ? "The election ended in a tie."
              : data.winnerCandidateId
                ? "The verified result is final."
                : "No winner was determined."}
          </p>
        </header>
        {data.winnerCandidateId
          ? (() => {
              const winner = ordered.find(
                (item) => item.candidate.id === data.winnerCandidateId,
              )!;
              return (
                <section className="mt-9 grid overflow-hidden rounded-3xl bg-brand-navy text-white shadow-brand sm:grid-cols-[0.55fr_1fr]">
                  <div className="min-h-64">
                    <CandidateImage
                      src={winner.candidate.photoUrl}
                      name={winner.candidate.name}
                    />
                  </div>
                  <div className="flex flex-col justify-center p-7 sm:p-10">
                    <Award className="size-9 text-brand-sky" />
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-brand-sky">
                      Election winner
                    </p>
                    <h2 className="mt-2 text-3xl font-bold">
                      {winner.candidate.name}
                    </h2>
                    <p className="mt-3 text-white/70">
                      Candidate {winner.candidate.ballotNumber}
                    </p>
                    <p className="mt-6 text-4xl font-bold">
                      {winner.votes}{" "}
                      <span className="text-base font-semibold text-white/65">
                        votes
                      </span>
                    </p>
                  </div>
                </section>
              );
            })()
          : null}
        <section className="mt-8 rounded-3xl border border-white bg-white p-6 shadow-brand sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-brand-navy">
              Vote breakdown
            </h2>
            <span className="rounded-full bg-brand-pale px-3 py-1 text-sm font-bold text-brand-blue">
              {data.ballotCount} ballots
            </span>
          </div>
          <div className="mt-6 space-y-5">
            {ordered.map(({ candidate, votes }) => {
              const percentage = data.ballotCount
                ? (votes / data.ballotCount) * 100
                : 0;
              return (
                <div key={candidate.id}>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-blue">
                        Candidate {candidate.ballotNumber}
                      </p>
                      <p className="mt-1 font-bold text-brand-navy">
                        {candidate.name}
                      </p>
                    </div>
                    <p className="text-right font-bold text-brand-navy">
                      {votes}{" "}
                      <span className="text-sm font-medium text-brand-slate">
                        ({percentage.toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-brand-pale">
                    <div
                      className="h-full rounded-full bg-brand-blue"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
