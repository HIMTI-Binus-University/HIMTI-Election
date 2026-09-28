import { PlayCircle, Vote } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentElection } from "@/api/elections";
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
        <header className="rounded-xl border border-brand-blue/20 bg-brand-pale px-6 py-9 sm:px-10 sm:py-12">
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

        <nav
          aria-label="Select a candidate"
          className="flex flex-wrap justify-center gap-4"
        >
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setParams({ candidate: candidate.id })}
              aria-pressed={candidate.id === selected.id}
              className={cn(
                "w-[calc(50%-0.5rem)] max-w-64 overflow-hidden rounded-xl border bg-white text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-56",
                candidate.id === selected.id
                  ? "border-brand-blue ring-1 ring-brand-blue"
                  : "border-border hover:border-brand-blue",
              )}
            >
              <div className="aspect-[4/3] overflow-hidden bg-brand-pale">
                <CandidateImage
                  src={candidate.photoUrl}
                  name={candidate.name}
                  className="bg-brand-pale bg-none text-brand-slate"
                />
              </div>
              <div className="p-4">
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
          className="space-y-10 sm:space-y-12"
          aria-label={`${selected.name} profile`}
        >
          <section className="grid overflow-hidden rounded-xl border border-border bg-white md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="aspect-[4/3] min-h-0 overflow-hidden bg-brand-pale md:aspect-auto">
              <CandidateImage
                src={selected.photoUrl}
                name={selected.name}
                className="bg-brand-pale bg-none text-brand-slate"
              />
            </div>
            <div className="flex min-w-0 flex-col justify-center p-6 sm:p-9">
              <p className="text-sm font-semibold text-brand-blue">
                Candidate #{String(selected.ballotNumber).padStart(2, "0")}
              </p>
              <h2 className="mt-2 break-words text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
                {selected.name}
              </h2>
              {selected.slogan && (
                <p className="mt-4 break-words text-lg font-semibold leading-7 text-brand-blue">
                  “{selected.slogan}”
                </p>
              )}
              {selected.biography && (
                <p className="mt-5 whitespace-pre-line break-words text-base leading-7 text-brand-slate">
                  {selected.biography}
                </p>
              )}
              {selected.experiences.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
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
            </div>
          </section>

          <section aria-labelledby="candidate-video">
            <h3
              id="candidate-video"
              className="text-2xl font-bold text-brand-navy"
            >
              Campaign video
            </h3>
            <div className="mt-5 aspect-video overflow-hidden rounded-xl bg-brand-navy">
              {embedUrl ? (
                <iframe
                  key={selected.id}
                  src={embedUrl}
                  title={`${selected.name} campaign video`}
                  className="h-full w-full"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="grid h-full place-items-center text-center text-white">
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
          </section>

          <section
            aria-label="Vision and mission"
            className="grid gap-6 md:grid-cols-2"
          >
            <div className="min-w-0 rounded-xl border border-border bg-white p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-brand-navy">Vision</h3>
              <p className="mt-4 whitespace-pre-line break-words text-base leading-8 text-brand-slate">
                {selected.vision}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-border bg-white p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-brand-navy">Mission</h3>
              <p className="mt-4 whitespace-pre-line break-words text-base leading-8 text-brand-slate">
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
              <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                {selected.workPrograms.map((item, index) => (
                  <li
                    key={index}
                    className="flex min-w-0 gap-4 rounded-xl border border-border bg-white p-5 text-base leading-7 text-brand-slate"
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
          {canVote && (
            <div className="flex flex-col gap-5 rounded-xl bg-brand-pale p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <h3 className="text-xl font-bold text-brand-navy">
                  Ready to vote?
                </h3>
                <p className="mt-1 text-sm leading-6 text-brand-slate">
                  Review your choice before submitting your ballot.
                </p>
              </div>
              <Button asChild className="shrink-0 px-7 py-4 text-base">
                <Link to="/vote" state={{ candidateId: selected.id }}>
                  <Vote className="size-4" aria-hidden="true" />
                  Vote for this candidate
                </Link>
              </Button>
            </div>
          )}
        </article>
      </div>
    </PageLayout>
  );
}
