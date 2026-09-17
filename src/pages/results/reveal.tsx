import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Award,
  CheckCircle2,
  FastForward,
  Flag,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Results } from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";
import { gsap } from "@/lib/motion";

type Stage =
  "intro" | "countdown" | "race" | "final" | "locked" | "hero" | "done";

const stageDurations: Partial<Record<Stage, number>> = {
  locked: 1_500,
  hero: 2_800,
};
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
  const [stage, setStage] = useState<Stage>(() => {
    try {
      return sessionStorage.getItem(storageKey) ? "done" : "intro";
    } catch {
      return "intro";
    }
  });
  const [count, setCount] = useState(3);
  const [progress, setProgress] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [sound, setSound] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const drumRef = useRef<number | null>(null);
  const laneRefs = useRef(new Map<string, HTMLElement>());
  const lanePositions = useRef(new Map<string, DOMRect>());
  const laneOrder = useRef("");
  const ordered = [...data.results].sort(
    (a, b) =>
      b.votes - a.votes || a.candidate.ballotNumber - b.candidate.ballotNumber,
  );
  const winner = data.winnerCandidateId
    ? ordered.find((item) => item.candidate.id === data.winnerCandidateId)
    : undefined;
  const maxVotes = Math.max(...ordered.map((item) => item.votes), 1);
  const leaders = ordered.filter((item) => item.votes === ordered[0]?.votes);
  const uniqueWinner = Boolean(winner) && !data.isTie;

  const stopDrumroll = () => {
    if (drumRef.current !== null) window.clearInterval(drumRef.current);
    drumRef.current = null;
  };

  const playHit = (frequency = 90, duration = 0.08, volume = 0.035) => {
    const context = audioRef.current;
    if (!context || context.state !== "running") return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(volume, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + duration,
    );
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  };

  const startDrumroll = () => {
    stopDrumroll();
    playHit();
    drumRef.current = window.setInterval(() => playHit(), 145);
  };

  const playWinnerSting = () => {
    const context = audioRef.current;
    if (!context || context.state !== "running") return;
    [261.63, 329.63, 392].forEach((frequency, index) => {
      window.setTimeout(() => playHit(frequency, 0.55, 0.045), index * 90);
    });
  };

  const finish = () => {
    stopDrumroll();
    try {
      sessionStorage.setItem(storageKey, "complete");
    } catch {
      // The reveal still works when browser storage is unavailable.
    }
    setStage("done");
  };
  const finishFromTimer = useEffectEvent(finish);
  const updateAudio = useEffectEvent(() => {
    if (stage === "final" && sound) startDrumroll();
    if (stage === "locked") stopDrumroll();
    if (stage === "hero" && sound) playWinnerSting();
  });
  const stopAudio = useEffectEvent(stopDrumroll);

  useLayoutEffect(() => {
    const order = Array.from(
      stageRef.current?.querySelectorAll<HTMLElement>(
        "[data-race-candidate]",
      ) ?? [],
    )
      .map((lane) => lane.dataset.raceCandidate)
      .join(":");
    if (order === laneOrder.current) return;
    laneOrder.current = order;

    laneRefs.current.forEach((lane, id) => {
      gsap.killTweensOf(lane);
      gsap.set(lane, { y: 0 });
      const current = lane.getBoundingClientRect();
      const previous = lanePositions.current.get(id);
      const distance = previous ? previous.top - current.top : 0;
      if (distance) {
        gsap.fromTo(
          lane,
          { y: distance },
          { y: 0, duration: 0.55, ease: "power3.out", overwrite: true },
        );
      }
      lanePositions.current.set(id, current);
    });
  });

  useEffect(() => {
    if (stage === "countdown") {
      const timer = window.setTimeout(() => {
        if (count > 1) setCount((value) => value - 1);
        else {
          setProgress(0);
          setStage("race");
        }
      }, 700);
      return () => window.clearTimeout(timer);
    }

    if (stage === "race" || stage === "final") {
      const motion = { progress: stage === "race" ? 0 : 0.72 };
      const target = stage === "race" ? 0.72 : 1;
      const tween = gsap.to(motion, {
        progress: target,
        duration: stage === "race" ? 11 : 5,
        ease: stage === "race" ? "power1.inOut" : "power3.out",
        onUpdate: () => setProgress(motion.progress),
        onComplete: () => {
          setProgress(target);
          setStage(stage === "race" ? "final" : "locked");
        },
      });
      return () => tween.kill();
    }

    const duration = stageDurations[stage];
    if (!duration) return;
    const timer = window.setTimeout(() => {
      if (stage === "locked") setStage("hero");
      if (stage === "hero") finishFromTimer();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [count, stage]);

  useEffect(() => {
    updateAudio();
    return stopAudio;
  }, [sound, stage]);

  useEffect(() => {
    const updateFullscreen = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    const stopHiddenAudio = () => {
      if (document.hidden) stopDrumroll();
    };
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("visibilitychange", stopHiddenAudio);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("visibilitychange", stopHiddenAudio);
      stopAudio();
      void audioRef.current?.close();
    };
  }, []);
  const begin = () => {
    if (reducedMotion) return finish();
    setCount(3);
    setProgress(0);
    setStage("countdown");
  };
  const replay = () => {
    stopDrumroll();
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Replay does not depend on browser storage.
    }
    setCount(3);
    setProgress(0);
    setStage("intro");
  };
  const toggleSound = async () => {
    if (!sound) {
      audioRef.current ??= new AudioContext();
      await audioRef.current.resume();
    } else {
      stopDrumroll();
    }
    setSound((value) => !value);
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
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

  const animated = ordered.map((item, index) => {
    const offset =
      ordered.length > 1 ? (index / (ordered.length - 1) - 0.5) * 0.2 : 0;
    const candidateProgress = Math.max(
      0,
      Math.min(1, progress + offset * Math.sin(Math.PI * progress)),
    );
    return {
      ...item,
      displayedVotes: Math.floor(item.votes * candidateProgress),
    };
  });
  const raceOrder = [...animated].sort(
    (a, b) =>
      b.displayedVotes - a.displayedVotes ||
      a.candidate.ballotNumber - b.candidate.ballotNumber,
  );
  const status =
    stage === "countdown"
      ? `${count}`
      : stage === "race"
        ? "The ceremonial ballot race is underway"
        : stage === "final"
          ? "Final stretch"
          : stage === "locked"
            ? "Verified totals locked"
            : stage === "hero"
              ? data.isTie
                ? "The election ended in a tie"
                : winner
                  ? `Winner: ${winner.candidate.name}`
                  : "No winner was determined"
              : "Final tally verified";

  return (
    <section
      ref={stageRef}
      className="reveal-stage page-reveal relative mx-auto min-h-[40rem] max-w-5xl overflow-y-auto rounded-[2rem] bg-brand-navy px-5 py-8 text-white shadow-brand sm:px-10 sm:py-12"
    >
      <div className="reveal-grid absolute inset-0" aria-hidden="true" />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </p>
      <div className="reveal-controls absolute left-5 top-5 z-20 flex gap-2">
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          {fullscreen ? (
            <Minimize2 className="size-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">
            {fullscreen ? "Exit fullscreen" : "Fullscreen"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => void toggleSound()}
          aria-pressed={sound}
          className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          {sound ? (
            <Volume2 className="size-4" aria-hidden="true" />
          ) : (
            <VolumeX className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Sound {sound ? "on" : "off"}</span>
        </button>
      </div>
      {stage !== "intro" && (
        <button
          onClick={finish}
          className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          <FastForward className="size-4" aria-hidden="true" />
          Skip
        </button>
      )}

      {stage === "intro" && (
        <div className="relative z-10 mx-auto flex min-h-[32rem] max-w-2xl flex-col items-center justify-center text-center">
          <CheckCircle2 className="size-14 text-white" aria-hidden="true" />
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.22em] text-white/80">
            Final tally verified
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
            The results are here.
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-white/70">
            Watch the verified result unfold in a ceremonial ballot race.
          </p>
          <p className="mt-3 max-w-xl text-xs leading-5 text-white/50">
            This visualization does not represent the chronological order in
            which ballots were cast.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <button
              onClick={begin}
              className="rounded-full bg-brand-blue px-7 py-3 font-bold text-white shadow-lg hover:bg-[#7599CA]"
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
          className="reveal-count relative z-10 grid min-h-[32rem] place-items-center text-[10rem] font-bold text-white"
          key={count}
        >
          {count}
        </div>
      )}

      {(stage === "race" || stage === "final" || stage === "locked") && (
        <div className="relative z-10 mx-auto flex min-h-[34rem] max-w-4xl flex-col justify-center pt-16">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
              Official result ceremony
            </p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">
              {stage === "race"
                ? "The ballot race is on"
                : stage === "final"
                  ? "Final stretch"
                  : "Verified totals locked"}
            </h2>
          </div>
          <div className="relative mt-10 space-y-3">
            <div
              className="absolute -top-6 right-0 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.18em] text-white/75"
              aria-hidden="true"
            >
              <Flag className="size-3" /> Finish
            </div>
            {raceOrder.map(({ candidate, votes, displayedVotes }, index) => (
              <article
                key={candidate.id}
                ref={(node) => {
                  if (node) laneRefs.current.set(candidate.id, node);
                  else laneRefs.current.delete(candidate.id);
                }}
                data-race-candidate={candidate.id}
                className={`race-lane relative overflow-hidden rounded-2xl border bg-white/[0.07] p-3 sm:p-4 ${stage === "locked" ? "is-finished border-white/60" : "border-white/15"}`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <span className="w-7 text-center text-lg font-bold text-white">
                    {index + 1}
                  </span>
                  <div className="aspect-[3/4] w-12 shrink-0 overflow-hidden rounded-lg border border-white/20 sm:w-14">
                    <CandidateImage
                      src={candidate.photoUrl}
                      name={candidate.name}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-white/70">
                          Ballot {candidate.ballotNumber}
                        </p>
                        <h3 className="truncate font-bold sm:text-lg">
                          {candidate.name}
                        </h3>
                      </div>
                      <p className="shrink-0 text-xl font-bold tabular-nums sm:text-2xl">
                        {displayedVotes}
                        <span className="ml-1 text-xs font-medium text-white/55">
                          votes
                        </span>
                      </p>
                    </div>
                    <div className="race-track relative mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="race-progress h-full rounded-full bg-brand-blue"
                        style={
                          {
                            width: `${(displayedVotes / maxVotes) * 100}%`,
                          } as CSSProperties
                        }
                      />
                      <span
                        className="race-finish absolute inset-y-0 right-0"
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
                <span className="sr-only">Final total: {votes} votes</span>
              </article>
            ))}
          </div>
        </div>
      )}

      {stage === "hero" && (
        <div className="relative z-10 grid min-h-[34rem] place-items-center py-16 text-center">
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
          <div className="winner-content relative z-10">
            {uniqueWinner && winner && (
              <>
                <div className="mx-auto aspect-[3/4] w-44 overflow-hidden rounded-[1.75rem] border-4 border-white shadow-[0_0_45px_rgba(255,255,255,0.25)] sm:w-56">
                  <CandidateImage
                    src={winner.candidate.photoUrl}
                    name={winner.candidate.name}
                  />
                </div>
                <Award
                  className="mx-auto mt-5 size-12 text-white"
                  aria-hidden="true"
                />
              </>
            )}
            <p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-white/80">
              Official result
            </p>
            <h2 className="mt-3 text-4xl font-bold sm:text-6xl">
              {data.isTie
                ? "A tied result"
                : winner
                  ? `Congratulations, ${winner.candidate.name}!`
                  : "No winner determined"}
            </h2>
            {winner && !data.isTie && (
              <p className="mt-4 text-xl font-bold text-white">
                {winner.votes} votes
              </p>
            )}
            {data.isTie && (
              <p className="mt-5 text-xl text-white/75">
                {leaders.map((item) => item.candidate.name).join(" & ")} share
                the highest tally.
              </p>
            )}
            {!winner && !data.isTie && (
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
