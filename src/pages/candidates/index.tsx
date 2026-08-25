import { PlayCircle, Vote } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useCurrentElection } from "@/api/elections";
import { ErrorState, LoadingState } from "@/components/async-state";
import { CandidateImage } from "@/components/candidate-image";
import { PageLayout } from "@/components/layout/page-layout";
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
  if (election.isError || !election.data)
    return (
      <PageLayout>
        <ErrorState retry={() => void election.refetch()} />
      </PageLayout>
    );
  const selectedId = params.get("candidate") ?? election.data.candidates[0]?.id;
  const selected =
    election.data.candidates.find((candidate) => candidate.id === selectedId) ??
    election.data.candidates[0];
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
      <div className="page-reveal mx-auto max-w-6xl">
        <header className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-blue">
            Get to know them
          </p>
          <h1 className="mt-2 text-4xl font-bold text-brand-navy sm:text-5xl">
            Our Candidates
          </h1>
        </header>
        <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5">
          {election.data.candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => setParams({ candidate: candidate.id })}
              aria-pressed={candidate.id === selected.id}
              className={cn(
                "overflow-hidden rounded-3xl border-2 bg-white text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                candidate.id === selected.id
                  ? "border-brand-blue shadow-brand"
                  : "border-white hover:border-brand-blue/25",
              )}
            >
              <div className="aspect-[4/3]">
                <CandidateImage
                  src={candidate.photoUrl}
                  name={candidate.name}
                />
              </div>
              <div className="p-4">
                <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-blue">
                  #{String(candidate.ballotNumber).padStart(2, "0")}
                </span>
                <p className="mt-1 font-bold text-brand-navy">
                  {candidate.name}
                </p>
              </div>
            </button>
          ))}
        </div>
        <article className="mt-9 overflow-hidden rounded-[2rem] border border-white bg-white shadow-brand">
          <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-brand-blue">
              Candidate #{String(selected.ballotNumber).padStart(2, "0")}
            </p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-brand-navy sm:text-5xl">
              {selected.name}
            </h2>
            {selected.slogan ? (
              <p className="mx-auto mt-4 max-w-2xl text-xl font-semibold leading-8 text-brand-blue">
                “{selected.slogan}”
              </p>
            ) : null}
            {selected.workPrograms.length ? (
              <section className="mx-auto mt-10 max-w-4xl text-left">
                <h3 className="text-2xl font-bold text-brand-navy">
                  Work Programs
                </h3>
                <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                  {selected.workPrograms.map((item, index) => (
                    <li
                      key={item}
                      className="flex gap-4 rounded-2xl border border-brand-blue/10 bg-brand-pale/70 p-5 text-base font-medium leading-7 text-brand-slate"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-blue font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="pt-1">{item}</span>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>
          <div className="bg-brand-navy p-4 sm:p-8">
            {embedUrl ? (
              <div className="aspect-video overflow-hidden rounded-2xl bg-black">
                <iframe
                  src={embedUrl}
                  title={`${selected.name} campaign video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="grid aspect-video place-items-center rounded-2xl bg-white/10 text-center text-white">
                <div>
                  <PlayCircle className="mx-auto size-12 text-brand-sky" />
                  <p className="mt-3 font-semibold">
                    Candidate video will be available soon
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="px-6 py-10 sm:px-12 sm:py-14">
            <section className="mx-auto grid max-w-5xl gap-5 md:grid-cols-2">
              <div className="rounded-3xl bg-brand-pale/70 p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-brand-navy">Vision</h3>
                <p className="mt-4 whitespace-pre-line text-base leading-8 text-brand-slate sm:text-lg">
                  {selected.vision}
                </p>
              </div>
              <div className="rounded-3xl bg-brand-navy p-6 text-white sm:p-8">
                <h3 className="text-2xl font-bold">Mission</h3>
                <p className="mt-4 whitespace-pre-line text-base leading-8 text-white/75 sm:text-lg">
                  {selected.mission}
                </p>
              </div>
            </section>
            {selected.experiences.length ? (
              <section className="mx-auto mt-12 max-w-4xl text-center">
                <h3 className="text-2xl font-bold text-brand-navy sm:text-3xl">
                  Organization Experience
                </h3>
                <ul className="mt-6 grid gap-3 text-left sm:grid-cols-2">
                  {selected.experiences.map((item) => (
                    <li
                      key={item}
                      className="rounded-2xl border border-brand-blue/10 bg-white p-5 text-base font-semibold leading-7 text-brand-slate shadow-sm"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
          {canVote ? (
            <div className="border-t border-border p-6 text-center sm:p-8">
              <Button asChild>
                <Link to="/vote" state={{ candidateId: selected.id }}>
                  <Vote className="size-4" />
                  Vote for this candidate
                </Link>
              </Button>
            </div>
          ) : null}
        </article>
      </div>
    </PageLayout>
  );
}
