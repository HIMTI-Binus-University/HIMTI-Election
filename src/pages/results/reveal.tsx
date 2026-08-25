import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Award,
  CheckCircle2,
  FastForward,
  Maximize2,
  Minimize2,
} from "lucide-react";
import type { Results } from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";

type Stage = "intro" | "countdown" | "suspense" | "tally" | "hero" | "done";

const particles = Array.from({ length: 12 }, (_, index) => index);

export function ResultsReveal({
  electionId,
  data,
  children,
}: {
  electionId: string;
  data: Results;
  children: ReactNode;
}) {
  const storageKey = `results-reveal:${electionId}`;
  const [reducedMotion] = useState(
    () =>
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [stage, setStage] = useState<Stage>(() =>
    sessionStorage.getItem(storageKey) ? "done" : "intro",
  );
  const [count, setCount] = useState(3);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const ordered = [...data.results].sort((a, b) => b.votes - a.votes);

  useEffect(() => {
    if (stage === "countdown") {
      const timer = window.setTimeout(() => {
        if (count > 1) setCount((value) => value - 1);
        else setStage("suspense");
      }, 700);
      return () => window.clearTimeout(timer);
    }
    const delays: Partial<Record<Stage, number>> = {
      suspense: 1200,
      tally: 1800,
      hero: 1500,
    };
    const delay = delays[stage];
    if (!delay) return;
    const timer = window.setTimeout(() => {
      if (stage === "suspense") setStage("tally");
      if (stage === "tally") setStage("hero");
      if (stage === "hero") {
        sessionStorage.setItem(storageKey, "complete");
        setStage("done");
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [count, stage, storageKey]);

  useEffect(() => {
    const update = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const finish = () => {
    sessionStorage.setItem(storageKey, "complete");
    setStage("done");
  };
  const begin = () => {
    if (reducedMotion) return finish();
    setCount(3);
    setStage("countdown");
  };
  const replay = () => {
    sessionStorage.removeItem(storageKey);
    setCount(3);
    setStage("intro");
  };
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stageRef.current?.requestFullscreen();
  };

  if (stage === "done")
    return (
      <>
        {children}
        <div className="mx-auto mt-6 max-w-5xl text-center">
          <button
            className="font-bold text-brand-blue underline-offset-4 hover:underline"
            onClick={replay}
          >
            Replay reveal
          </button>
        </div>
      </>
    );

  const maxVotes = Math.max(...ordered.map((item) => item.votes), 1);
  const leaders = ordered.filter((item) => item.votes === ordered[0]?.votes);
  const uniqueWinner = Boolean(data.winnerCandidateId) && !data.isTie;
  const status =
    stage === "countdown"
      ? `${count}`
      : stage === "suspense"
        ? "Candidates confirmed"
        : stage === "tally"
          ? "Revealing the verified tally"
          : stage === "hero"
            ? data.isTie
              ? "The election ended in a tie"
              : data.winnerCandidateId
                ? `Winner: ${leaders[0]?.candidate.name}`
                : "No winner was determined"
            : "Final tally verified";

  return (
    <section
      ref={stageRef}
      className="reveal-stage page-reveal relative mx-auto min-h-[34rem] max-w-5xl overflow-y-auto rounded-[2rem] bg-brand-navy px-5 py-8 text-white shadow-brand sm:px-10 sm:py-12"
    >
      <div className="reveal-grid absolute inset-0" aria-hidden="true" />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </p>
      <button
        type="button"
        onClick={() => void toggleFullscreen()}
        className="absolute left-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10"
      >
        {fullscreen ? (
          <Minimize2 className="size-4" aria-hidden="true" />
        ) : (
          <Maximize2 className="size-4" aria-hidden="true" />
        )}
        {fullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
      {stage !== "intro" && (
        <button
          onClick={finish}
          className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          <FastForward className="size-4" /> Skip animation
        </button>
      )}

      {stage === "intro" && (
        <div className="relative z-10 mx-auto flex min-h-[28rem] max-w-2xl flex-col items-center justify-center text-center">
          <CheckCircle2 className="size-14 text-brand-sky" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-brand-sky">
            Final tally verified
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            The results are here.
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-white/70">
            The votes have been counted and verified. Let&apos;s reveal the
            result together.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <button
              onClick={begin}
              className="rounded-full bg-cyan-300 px-7 py-3 font-bold text-brand-navy shadow-lg hover:bg-cyan-200"
            >
              Begin reveal
            </button>
            <button
              onClick={finish}
              className="rounded-full border border-white/40 px-7 py-3 font-bold hover:bg-white/10"
            >
              View full results
            </button>
          </div>
        </div>
      )}

      {stage === "countdown" && (
        <div
          className="reveal-count relative z-10 grid min-h-[28rem] place-items-center text-[10rem] font-bold text-cyan-300"
          key={count}
        >
          {count}
        </div>
      )}

      {(stage === "suspense" || stage === "tally") && (
        <div className="relative z-10 mx-auto flex min-h-[28rem] max-w-6xl flex-col justify-center pt-14">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-brand-sky">
            Official candidate tally
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold">
            {stage === "suspense" ? "Candidates confirmed" : "Verified votes"}
          </h2>
          <div
            className={`mt-8 grid gap-4 ${ordered.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "mx-auto max-w-sm"}`}
          >
            {ordered.map(({ candidate, votes }) => (
              <article
                key={candidate.id}
                className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-sm"
              >
                <div className="h-44">
                  <CandidateImage
                    src={candidate.photoUrl}
                    name={candidate.name}
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-sky">
                    Candidate {candidate.ballotNumber}
                  </p>
                  <h3 className="mt-1 text-lg font-bold">{candidate.name}</h3>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className={`reveal-bar h-full rounded-full bg-cyan-300 ${stage === "tally" ? "is-visible" : ""}`}
                      style={
                        {
                          "--result-width": `${(votes / maxVotes) * 100}%`,
                        } as CSSProperties
                      }
                    />
                  </div>
                  <p
                    className={`mt-3 text-2xl font-bold ${stage === "tally" ? "opacity-100" : "opacity-0"}`}
                  >
                    {votes} <span className="text-sm text-white/60">votes</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {stage === "hero" && (
        <div className="relative z-10 grid min-h-[28rem] place-items-center text-center">
          {uniqueWinner && (
            <div className="winner-rays" aria-hidden="true">
              {particles.map((particle) => (
                <i
                  key={particle}
                  style={{ "--particle": particle } as CSSProperties}
                />
              ))}
            </div>
          )}
          <div>
            {uniqueWinner && (
              <Award className="mx-auto size-16 text-cyan-300" />
            )}
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-brand-sky">
              Official result
            </p>
            <h2 className="mt-3 text-4xl font-bold sm:text-6xl">
              {data.isTie
                ? "A tied result"
                : data.winnerCandidateId
                  ? leaders[0]?.candidate.name
                  : "No winner determined"}
            </h2>
            {data.isTie && (
              <p className="mt-5 text-xl text-white/75">
                {leaders.map((item) => item.candidate.name).join(" & ")} share
                the highest tally.
              </p>
            )}
            {!data.winnerCandidateId && !data.isTie && (
              <p className="mt-5 text-xl text-white/75">
                No votes were recorded for a winning candidate.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
