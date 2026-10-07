import { PlayCircle, Vote } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useSession } from "@/api/auth";
import { useCurrentElection, useVoteStatus } from "@/api/elections";
import { ErrorState, LoadingState } from "@/components/async-state";
import { CandidateImage } from "@/components/candidate-image";
import { PageLayout } from "@/components/layout/page-layout";
import { NoElection } from "@/components/no-election";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isVotingTime } from "@/utils/date";

const getEmbedUrl = (value: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be")
      return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
    if (url.hostname.endsWith("youtube.com"))
      return `https://www.youtube.com/embed/${url.searchParams.get("v") ?? ""}`;
    if (url.hostname === "drive.google.com")
      return value.includes("/preview")
        ? value
        : value.replace(/\/view.*$/, "/preview");
    return null;
  } catch {
    return null;
  }
};

export default function CandidatesPage() {
  const election = useCurrentElection();
  const session = useSession();
  const voteStatus = useVoteStatus(election.data?.id, Boolean(session.data));
  const [params, setParams] = useSearchParams();
  if (election.isLoading)
    return (
      <PageLayout>
        <LoadingState label="Loading candidates" />
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
        <NoElection message="Candidate profiles will appear here when the next HIMTI Election is ready." />
      </PageLayout>
    );
  const candidates = [...election.data.candidates].sort(
    (a, b) => a.ballotNumber - b.ballotNumber,
  );
  const selectedId = params.get("candidate") ?? candidates[0]?.id;
  const selected =
    candidates.find((candidate) => candidate.id === selectedId) ??
    candidates[0];
  if (!selected)
    return (
      <PageLayout>
        <ErrorState
          title="No candidates available"
          message="Candidate profiles have not been published."
        />
      </PageLayout>
    );
  const embedUrl = getEmbedUrl(selected.videoUrl);
  const canVote =
    election.data.status === "OPEN" &&
    isVotingTime(election.data.startsAt, election.data.endsAt);

  return (
    <PageLayout>
      <div className="mx-auto max-w-6xl space-y-9 sm:space-y-12">
        <header className="max-w-3xl py-2 sm:py-4">
          <p className="text-sm font-semibold text-brand-blue">
            {election.data.title}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-brand-navy sm:text-5xl">
            Our Candidates
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-brand-slate">
            Meet the people on the ballot. Explore their plans before you make
            your choice.
          </p>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8">
          <nav
            aria-label="Select a candidate"
            className="flex min-w-0 gap-3 overflow-x-auto lg:sticky lg:top-24 lg:z-20 lg:max-h-[calc(100dvh-8rem)] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:rounded-xl lg:bg-background lg:p-1 lg:top-28"
          >
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => setParams({ candidate: candidate.id })}
                aria-pressed={candidate.id === selected.id}
                className={cn(
                  "flex min-h-20 w-56 shrink-0 items-center gap-3 rounded-xl border bg-white p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:w-full",
                  candidate.id === selected.id
                    ? "border-brand-blue bg-brand-pale ring-1 ring-brand-blue"
                    : "border-border hover:border-brand-blue",
                )}
              >
                <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-brand-pale [&_svg]:size-6">
                  <CandidateImage
                    src={candidate.photoUrl}
                    name={candidate.name}
                    className="bg-brand-pale bg-none text-brand-slate"
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-brand-blue">
                    Candidate #{String(candidate.ballotNumber).padStart(2, "0")}
                  </span>
                  <p className="mt-1 break-words font-bold text-brand-navy">
                    {candidate.name}
                  </p>
                </div>
              </button>
            ))}
          </nav>

          <article
            className="min-w-0 space-y-6"
            aria-label={`${selected.name} profile`}
          >
            <section className="space-y-6 rounded-xl border border-border bg-white p-5 shadow-brand sm:p-8">
              <div className="flex items-start gap-4 sm:gap-6">
                <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-brand-pale sm:size-36">
                  <CandidateImage
                    src={selected.photoUrl}
                    name={selected.name}
                    className="bg-brand-pale bg-none text-brand-slate"
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-blue">
                    Candidate #{String(selected.ballotNumber).padStart(2, "0")}
                  </p>
                  <h2 className="mt-2 break-words text-2xl font-bold tracking-tight text-brand-navy sm:text-3xl">
                    {selected.name}
                  </h2>
                  {selected.slogan && (
                    <p className="mt-3 break-words text-base font-semibold leading-7 text-brand-blue">
                      “{selected.slogan}”
                    </p>
                  )}
                </div>
              </div>
              {selected.biography && (
                <p className="max-w-prose whitespace-pre-line break-words text-base leading-7 text-brand-slate">
                  {selected.biography}
                </p>
              )}
              {selected.experiences.length > 0 && (
                <div className="min-w-0 border-t border-border pt-4">
                  <h3 className="font-bold text-brand-navy">
                    Organization experience
                  </h3>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-6 text-brand-slate">
                    {selected.experiences.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            <section aria-labelledby="candidate-video">
              <h3
                id="candidate-video"
                className="text-2xl font-bold text-brand-navy"
              >
                Campaign video
              </h3>
              <div
                className={cn(
                  "relative mt-4 overflow-hidden rounded-xl bg-brand-navy shadow-brand",
                  embedUrl?.startsWith("https://drive.google.com/")
                    ? "h-80 sm:h-auto sm:aspect-video"
                    : "aspect-video",
                )}
              >
                {embedUrl ? (
                  <iframe
                    key={selected.id}
                    src={embedUrl}
                    title={`${selected.name} campaign video`}
                    className="absolute inset-0 h-full w-full border-0"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-5 text-center text-white">
                    <div>
                      <PlayCircle
                        className="mx-auto size-12 text-brand-sky"
                        aria-hidden="true"
                      />
                      <p className="mt-3 font-semibold">
                        Candidate video will be available soon
                      </p>
                    </div>
                  </div>
                )}
              </div>
              {embedUrl && selected.videoUrl && (
                <a
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-11 items-center rounded-lg text-sm font-semibold text-brand-blue underline underline-offset-4 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Open campaign video in a new tab
                </a>
              )}
            </section>

            <section
              aria-label="Vision and mission"
              className="grid gap-6 border-t border-border pt-6 xl:grid-cols-2"
            >
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-brand-navy">Vision</h3>
                <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-brand-slate">
                  {selected.vision}
                </p>
              </div>
              <div className="min-w-0">
                <h3 className="text-2xl font-bold text-brand-navy">Mission</h3>
                <p className="mt-3 whitespace-pre-line break-words text-base leading-7 text-brand-slate">
                  {selected.mission}
                </p>
              </div>
            </section>

            {selected.workPrograms.length > 0 && (
              <section aria-labelledby="work-programs">
                <h3
                  id="work-programs"
                  className="text-2xl font-bold text-brand-navy"
                >
                  Work Programs
                </h3>
                <ol className="mt-3 divide-y divide-border">
                  {selected.workPrograms.map((item, index) => (
                    <li
                      key={index}
                      className="flex min-w-0 gap-4 py-4 text-base leading-7 text-brand-slate"
                    >
                      <span className="font-bold text-brand-blue">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 break-words">{item}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            {(canVote || voteStatus.data?.hasVoted) && (
              <div className="flex flex-col gap-3 rounded-xl bg-brand-pale p-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-brand-navy">
                    {voteStatus.data?.hasVoted
                      ? "You already voted"
                      : "Ready to vote?"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-brand-slate">
                    {voteStatus.data?.hasVoted
                      ? "Your vote has been recorded."
                      : "Review your choice before submitting your ballot."}
                  </p>
                </div>
                {session.data && !voteStatus.data ? (
                  <Button disabled className="shrink-0 px-7 py-4 text-base">
                    {voteStatus.isError
                      ? "Vote status unavailable"
                      : "Checking vote status..."}
                  </Button>
                ) : voteStatus.data?.hasVoted ? (
                  <Button disabled className="shrink-0 px-7 py-4 text-base">
                    You already voted
                  </Button>
                ) : (
                  <Button asChild className="shrink-0 px-7 py-4 text-base">
                    <Link to="/vote" state={{ candidateId: selected.id }}>
                      <Vote className="size-4" aria-hidden="true" />
                      Vote for this candidate
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </article>
        </div>
      </div>
    </PageLayout>
  );
}
