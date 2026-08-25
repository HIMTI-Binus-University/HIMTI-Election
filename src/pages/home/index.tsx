import { ArrowRight, CalendarDays, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { useCurrentElection } from "@/api/elections";
import { ErrorState, LoadingState } from "@/components/async-state";
import { CandidateImage } from "@/components/candidate-image";
import { ElectionCountdown } from "@/components/countdown";
import { PageLayout } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import {
  formatElectionDate,
  formatElectionDay,
  isVotingTime,
} from "@/utils/date";

export default function HomePage() {
  const election = useCurrentElection();
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
        <section className="page-reveal mx-auto max-w-2xl rounded-[2rem] border border-white bg-white p-10 text-center shadow-brand">
          <Vote className="mx-auto size-12 text-brand-blue" />
          <h1 className="mt-5 text-3xl font-bold text-brand-navy">
            No election is active
          </h1>
          <p className="mt-3 text-brand-slate">
            The next HIMTI election will appear here when it is ready.
          </p>
        </section>
      </PageLayout>
    );

  const data = election.data;
  const canVote =
    data.status === "OPEN" && isVotingTime(data.startsAt, data.endsAt);

  return (
    <PageLayout>
      <div className="page-reveal mx-auto max-w-6xl space-y-14 sm:space-y-20">
        <section className="rounded-[2rem] border border-white bg-white/85 px-5 py-12 text-center shadow-brand backdrop-blur sm:px-10 sm:py-16">
          <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue">
            {formatElectionDay(data.startsAt)} -{" "}
            {formatElectionDay(data.endsAt)}
          </p>
          <h1 className="mx-auto mt-5 max-w-4xl text-5xl font-bold uppercase leading-[1.02] tracking-[-0.05em] text-brand-navy sm:text-7xl">
            {data.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg font-semibold leading-8 text-brand-slate">
            {data.description ?? "One family, one goal."}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {canVote ? (
              <Button asChild>
                <Link to="/vote">
                  <Vote className="size-4" />
                  Cast your vote
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to="/candidates">
                Explore candidates
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        <ElectionCountdown startsAt={data.startsAt} endsAt={data.endsAt} />

        <section>
          <h2 className="text-center text-3xl font-bold text-brand-navy sm:text-4xl">
            Election Schedule
          </h2>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <article className="rounded-[2rem] bg-brand-navy p-7 text-white shadow-brand sm:p-9">
              <CalendarDays className="size-7 text-brand-sky" />
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-white/55">
                Election date
              </p>
              <p className="mt-2 text-2xl font-bold leading-9">
                {formatElectionDate(data.startsAt)}
                <br />
                until {formatElectionDate(data.endsAt)}
              </p>
            </article>
            <article className="rounded-[2rem] border border-brand-blue/10 bg-white p-7 shadow-brand sm:p-9">
              <CalendarDays className="size-7 text-brand-blue" />
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-brand-blue">
                Online debate
              </p>
              <p className="mt-2 text-2xl font-bold leading-9 text-brand-navy">
                {data.debateAt
                  ? formatElectionDate(data.debateAt)
                  : "Schedule will be announced"}
              </p>
            </article>
          </div>
        </section>

        <section>
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-blue">
              Our candidates
            </p>
            <h2 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">
              Choose with confidence
            </h2>
          </div>
          <div className="mt-8 space-y-7">
            {data.candidates.map((candidate, index) => (
              <article
                key={candidate.id}
                className="grid overflow-hidden rounded-[2rem] border border-white bg-white shadow-brand lg:grid-cols-[0.8fr_1.2fr]"
              >
                <div className={index % 2 ? "lg:order-2" : ""}>
                  <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-96">
                    <span className="absolute left-5 top-5 z-10 rounded-full bg-white/90 px-4 py-2 text-xl font-bold text-brand-blue shadow">
                      #{String(candidate.ballotNumber).padStart(2, "0")}
                    </span>
                    <CandidateImage
                      src={candidate.photoUrl}
                      name={candidate.name}
                    />
                  </div>
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <h3 className="text-3xl font-bold text-brand-navy">
                    {candidate.name}
                  </h3>
                  {candidate.slogan ? (
                    <p className="mt-3 text-lg font-semibold leading-8 text-brand-blue">
                      “{candidate.slogan}”
                    </p>
                  ) : null}
                  <div className="mt-7 grid gap-5 sm:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-brand-navy">
                        Vision
                      </h4>
                      <p className="mt-2 line-clamp-5 text-sm leading-7 text-brand-slate">
                        {candidate.vision}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-brand-navy">
                        Mission
                      </h4>
                      <p className="mt-2 line-clamp-5 whitespace-pre-line text-sm leading-7 text-brand-slate">
                        {candidate.mission}
                      </p>
                    </div>
                  </div>
                  {candidate.workPrograms.length ? (
                    <div className="mt-6">
                      <h4 className="text-sm font-bold uppercase tracking-[0.1em] text-brand-navy">
                        Work programs
                      </h4>
                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm leading-6 text-brand-slate">
                        {candidate.workPrograms.slice(0, 3).map((program) => (
                          <li key={program}>{program}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                  <Button asChild variant="outline" className="mt-7 self-start">
                    <Link to={`/candidates?candidate=${candidate.id}`}>
                      Profile and video
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
