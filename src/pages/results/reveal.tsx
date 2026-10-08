import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
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
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { Results } from "@/api/elections";
import { CandidateImage } from "@/components/candidate-image";
import { Button } from "@/components/ui/button";
import { gsap, useGSAP } from "@/lib/motion";

type Stage =
  "intro" | "countdown" | "race" | "final" | "locked" | "hero" | "done";

// Seconds from Begin reveal. The final stretch is part of the same count tween.
const timing = { race: 1.8, final: 9.3, locked: 11.8, hero: 12.6, done: 15 };
const particles = Array.from({ length: 160 }, (_, index) => index);

export function ResultsReveal({
  electionId,
  data,
  children,
}: {
  electionId: string;
  data: Results;
  children: (replayButton: ReactNode) => ReactNode;
}) {
  const storageKey = `results-reveal:${electionId}`;
  const [reducedMotion, setReducedMotion] = useState(
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
  const [fullscreen, setFullscreen] = useState(false);
  const [sound, setSound] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const beginRef = useRef<HTMLButtonElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const focusPending = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const audioNodes = useRef(new Map<OscillatorNode, GainNode>());
  const audioRequest = useRef(0);
  const soundEnabled = useRef(false);
  const laneRefs = useRef(new Map<string, HTMLElement>());
  const ordered = useMemo(
    () =>
      [...data.results].sort(
        (a, b) =>
          b.votes - a.votes ||
          a.candidate.ballotNumber - b.candidate.ballotNumber,
      ),
    [data.results],
  );
  const winner = data.winnerCandidateId
    ? ordered.find((item) => item.candidate.id === data.winnerCandidateId)
    : undefined;
  const maxVotes = Math.max(...ordered.map((item) => item.votes), 1);
  const leaders = ordered.filter((item) => item.votes === ordered[0]?.votes);
  const uniqueWinner = Boolean(winner) && !data.isTie;
  const running = stage !== "intro" && stage !== "done";
  const racing = stage === "race" || stage === "final" || stage === "locked";

  const disposeAudio = () => {
    audioRequest.current += 1;
    soundEnabled.current = false;
    audioNodes.current.forEach((gain, oscillator) => {
      oscillator.onended = null;
      oscillator.stop();
      oscillator.disconnect();
      gain.disconnect();
    });
    audioNodes.current.clear();
    const context = audioRef.current;
    audioRef.current = null;
    if (context && context.state !== "closed")
      void context.close().catch(() => {});
  };

  const playHit = (frequency = 90, duration = 0.08, volume = 0.035) => {
    const context = audioRef.current;
    if (
      !soundEnabled.current ||
      document.hidden ||
      context?.state !== "running"
    )
      return;
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
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      audioNodes.current.delete(oscillator);
    };
    oscillator.start();
    audioNodes.current.set(oscillator, gain);
    oscillator.stop(context.currentTime + duration);
  };

  const finish = () => {
    timelineRef.current?.kill();
    timelineRef.current = null;
    disposeAudio();
    setSound(false);
    if (document.fullscreenElement === stageRef.current) {
      void document.exitFullscreen().catch(() => {});
    }
    try {
      sessionStorage.setItem(storageKey, "complete");
    } catch {
      // The reveal still works when browser storage is unavailable.
    }
    focusPending.current = true;
    setStage("done");
  };
  const stopAudio = useEffectEvent(disposeAudio);

  useGSAP(
    () => {
      if (!running || !stageRef.current) return;
      const root = stageRef.current;
      const intro = root.querySelector(".reveal-intro");
      const countdown = root.querySelector(".reveal-countdown");
      const numeral = root.querySelector(".reveal-count");
      const race = root.querySelector(".reveal-race");
      const hero = root.querySelector(".reveal-hero");
      const confetti = root.querySelectorAll(".winner-confetti i");
      const motion = { progress: 0 };
      const timeline = gsap.timeline({ paused: true });
      timelineRef.current = timeline;
      const lanes = ordered.flatMap((item, index) => {
        const node = laneRefs.current.get(item.candidate.id);
        const bar = node?.querySelector<HTMLElement>(".race-progress");
        const total = node?.querySelector<HTMLElement>("[data-race-total]");
        const rank = node?.querySelector<HTMLElement>("[data-race-rank]");
        if (!node || !bar || !total || !rank) return [];
        gsap.set(node, { y: 0 });
        gsap.set(bar, { scaleX: 0 });
        return [
          {
            ...item,
            node,
            total,
            rank,
            setY: gsap.quickSetter(node, "y", "px"),
            setScale: gsap.quickSetter(bar, "scaleX"),
            offset:
              ordered.length > 1
                ? (index / (ordered.length - 1) - 0.5) * 0.2
                : 0,
            value: 0,
            integer: -1,
            position: -1,
          },
        ];
      });
      const ranking = [...lanes];
      const before = new Array<number>(lanes.length);
      const after = new Array<number>(lanes.length);

      const updateRace = () => {
        const wave = Math.sin(Math.PI * motion.progress);
        for (const lane of lanes) {
          // Deterministic ceremonial pacing, bounded by each verified total.
          const fraction = Math.max(
            0,
            Math.min(1, motion.progress + lane.offset * wave),
          );
          lane.value =
            motion.progress === 1 ? lane.votes : lane.votes * fraction;
        }
        // Start in the first moving order so the entrance itself does not shuffle.
        ranking.sort(
          (a, b) =>
            (motion.progress === 0
              ? b.votes * (1 + b.offset * Math.PI) -
                a.votes * (1 + a.offset * Math.PI)
              : b.value - a.value) ||
            a.candidate.ballotNumber - b.candidate.ballotNumber,
        );
        const swapped = ranking.some((lane, index) => lane.position !== index);
        if (swapped) {
          // Capture the CURRENT transformed positions before interrupting a swap.
          lanes.forEach((lane, index) => {
            before[index] = lane.node.getBoundingClientRect().top;
          });
        }
        for (const lane of lanes) {
          lane.setScale(lane.value / maxVotes);
          const integer = Math.floor(lane.value);
          if (integer !== lane.integer) {
            lane.total.textContent = integer.toLocaleString();
            lane.integer = integer;
          }
        }
        if (!swapped) return;
        const initial = ranking[0]?.position === -1;
        ranking.forEach((lane, index) => {
          timeline.killTweensOf(lane.node);
          lane.setY(0);
          lane.node.style.order = String(index);
          lane.node.style.zIndex = String(ranking.length - index);
          lane.rank.textContent = String(index + 1);
          lane.position = index;
        });
        // All layout writes above, then all reads, then transform-only writes.
        lanes.forEach((lane, index) => {
          after[index] = lane.node.getBoundingClientRect().top;
        });
        if (initial) return;
        lanes.forEach((lane, index) => {
          const distance = before[index] - after[index];
          if (!distance) return;
          lane.setY(distance);
          timeline.to(
            lane.node,
            { y: 0, duration: 0.42, ease: "power2.out" },
            timeline.time(),
          );
        });
      };

      updateRace();
      gsap.set(intro, { autoAlpha: 1 });
      gsap.set([countdown, race, hero], { autoAlpha: 0 });
      gsap.set(numeral, { autoAlpha: 0 });
      timeline.to(intro, { autoAlpha: 0, y: -6, duration: 0.16 }, 0);
      timeline.set(countdown, { autoAlpha: 1 }, 0);
      for (let index = 0; index < 3; index += 1) {
        const at = index * 0.6;
        timeline.call(() => setCount(3 - index), [], at);
        timeline.fromTo(
          numeral,
          { autoAlpha: 0, scale: 0.96, y: 6 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.16,
            ease: "power2.out",
            immediateRender: false,
          },
          at + 0.06,
        );
        timeline.to(
          numeral,
          { autoAlpha: 0, y: -6, duration: 0.14 },
          at + 0.46,
        );
      }
      timeline.set(countdown, { autoAlpha: 0 }, timing.race);
      timeline.call(() => setStage("race"), [], timing.race);
      timeline.fromTo(
        race,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" },
        timing.race,
      );
      timeline.to(
        motion,
        {
          progress: 1,
          duration: timing.locked - timing.race,
          ease: "sine.inOut",
          onUpdate: updateRace,
        },
        timing.race,
      );
      timeline.call(() => setStage("final"), [], timing.final);
      for (let at = timing.final; at < timing.locked - 0.08; at += 0.145) {
        timeline.call(() => playHit(), [], at);
      }
      timeline.call(() => setStage("locked"), [], timing.locked);
      timeline.to(
        race,
        { autoAlpha: 0, y: -6, duration: 0.18 },
        timing.hero - 0.18,
      );
      timeline.call(() => setStage("hero"), [], timing.hero);
      timeline.fromTo(
        hero,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out" },
        timing.hero,
      );
      confetti.forEach((piece) => {
        const duration = gsap.utils.random(1.5, 2.15);
        const start = timing.hero + gsap.utils.random(0, 0.15);
        timeline.fromTo(
          piece,
          {
            y: gsap.utils.random(-70, -20),
            x: gsap.utils.random(-25, 25),
            opacity: 1,
            rotation: gsap.utils.random(0, 360),
            rotationX: gsap.utils.random(0, 360),
          },
          {
            y: () => (hero?.getBoundingClientRect().height ?? 600) + 40,
            rotation: `+=${gsap.utils.random(-720, 720)}`,
            rotationX: `+=${gsap.utils.random(-540, 540)}`,
            duration,
            ease: "none",
          },
          start,
        );
        timeline.to(
          piece,
          {
            x: gsap.utils.random(-75, 75),
            duration: duration / 4,
            repeat: 3,
            yoyo: true,
            ease: "sine.inOut",
          },
          start,
        );
      });
      if (uniqueWinner) {
        [261.63, 329.63, 392].forEach((frequency, index) => {
          timeline.call(
            () => playHit(frequency, 0.55, 0.045),
            [],
            timing.hero + index * 0.09,
          );
        });
      }
      timeline.to(hero, { autoAlpha: 0, duration: 0.16 }, timing.done - 0.16);
      timeline.call(finish, [], timing.done);
      if (!document.hidden) timeline.play(0);
      return () => {
        timeline.kill();
        if (timelineRef.current === timeline) timelineRef.current = null;
        lanes.forEach(({ node }) => {
          node.style.removeProperty("order");
        });
        disposeAudio();
      };
    },
    {
      scope: stageRef,
      dependencies: [running, ordered, maxVotes, uniqueWinner, storageKey],
      revertOnUpdate: true,
    },
  );

  useLayoutEffect(() => {
    if (stage === "countdown") skipRef.current?.focus({ preventScroll: true });
    if (!focusPending.current) return;
    if (stage === "done") {
      const heading = resultsRef.current?.querySelector<HTMLElement>(
        "[data-results-heading]",
      );
      (heading ?? resultsRef.current)?.focus({ preventScroll: true });
      focusPending.current = false;
    } else if (stage === "intro") {
      beginRef.current?.focus({ preventScroll: true });
      focusPending.current = false;
    }
  }, [stage]);

  const handleVisibility = useEffectEvent(() => {
    if (document.hidden) {
      timelineRef.current?.pause();
      disposeAudio();
      setSound(false);
    } else {
      timelineRef.current?.resume();
    }
  });
  const handleMotionPreference = useEffectEvent(
    (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
      if (event.matches && running) finish();
    },
  );
  useEffect(() => {
    const updateFullscreen = () =>
      setFullscreen(document.fullscreenElement === stageRef.current);
    const media =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const updateMotion = (event: MediaQueryListEvent) =>
      handleMotionPreference(event);
    const updateVisibility = () => handleVisibility();
    document.addEventListener("fullscreenchange", updateFullscreen);
    document.addEventListener("visibilitychange", updateVisibility);
    media?.addEventListener("change", updateMotion);
    return () => {
      document.removeEventListener("fullscreenchange", updateFullscreen);
      document.removeEventListener("visibilitychange", updateVisibility);
      media?.removeEventListener("change", updateMotion);
      stopAudio();
    };
  }, []);

  const begin = () => {
    if (reducedMotion) return finish();
    setCount(3);
    setStage("countdown");
  };
  const replay = () => {
    timelineRef.current?.kill();
    disposeAudio();
    setSound(false);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // Replay does not depend on browser storage.
    }
    focusPending.current = true;
    setCount(3);
    setStage("intro");
  };
  const toggleSound = async () => {
    if (soundEnabled.current) {
      disposeAudio();
      setSound(false);
      return;
    }
    const request = ++audioRequest.current;
    soundEnabled.current = true;
    setSound(true);
    try {
      const context = new AudioContext();
      audioRef.current = context;
      await context.resume();
      if (request === audioRequest.current && document.hidden) {
        disposeAudio();
        setSound(false);
      }
    } catch {
      if (request === audioRequest.current) {
        disposeAudio();
        setSound(false);
      }
    }
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement === stageRef.current)
        await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen();
    } catch {
      setFullscreen(false);
    }
  };

  if (stage === "done") {
    return (
      <div
        ref={resultsRef}
        tabIndex={-1}
        className="outline-none"
        role="region"
        aria-label="Election results"
      >
        {children(
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={replay}
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Replay reveal
          </Button>,
        )}
      </div>
    );
  }

  const status =
    stage === "countdown"
      ? `Reveal begins in ${count}`
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
      data-stage={stage}
      aria-label="Election result ceremony"
      className="reveal-stage relative mx-auto max-w-5xl rounded-2xl bg-brand-navy px-5 py-5 text-white sm:px-10 sm:py-8"
    >
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {status}
      </p>
      <div className="reveal-controls">
        <button
          type="button"
          onClick={() => void toggleFullscreen()}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="reveal-control"
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
          aria-label={sound ? "Mute reveal sound" : "Enable reveal sound"}
          className="reveal-control"
        >
          {sound ? (
            <Volume2 className="size-4" aria-hidden="true" />
          ) : (
            <VolumeX className="size-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">Sound {sound ? "on" : "off"}</span>
        </button>
        <button
          ref={skipRef}
          type="button"
          onClick={finish}
          disabled={stage === "intro"}
          aria-hidden={stage === "intro"}
          className="reveal-control reveal-skip"
        >
          <FastForward className="size-4" aria-hidden="true" /> Skip
        </button>
      </div>

      <div className="reveal-body">
        <div
          className="reveal-scene reveal-intro mx-auto flex max-w-2xl flex-col items-center justify-center text-center"
          aria-hidden={stage !== "intro"}
          inert={stage !== "intro"}
        >
          <CheckCircle2 className="size-12 text-white" aria-hidden="true" />
          <p className="mt-6 text-sm font-semibold text-white/80">
            Final tally verified
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            The results are here.
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-white/80">
            Watch the verified result unfold in a 15-second ceremonial ballot
            race.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              ref={beginRef}
              type="button"
              onClick={begin}
              className="reveal-action rounded-full bg-brand-blue px-7 py-3 font-bold text-white hover:bg-[#0059be]"
            >
              Begin reveal
            </button>
            <button
              type="button"
              onClick={finish}
              className="reveal-action rounded-full border border-white/40 px-7 py-3 font-bold hover:bg-white/10"
            >
              View full results
            </button>
          </div>
          {reducedMotion && (
            <p className="mt-4 text-sm text-white/80">
              Reduced motion is on. Begin reveal opens the full results
              directly.
            </p>
          )}
        </div>

        <div
          className="reveal-scene reveal-countdown grid place-items-center"
          aria-hidden={stage !== "countdown"}
          inert={stage !== "countdown"}
        >
          <span
            className="reveal-count text-[8rem] font-bold tabular-nums sm:text-[10rem]"
            aria-hidden="true"
          >
            {count}
          </span>
        </div>

        <div
          className="reveal-scene reveal-race mx-auto flex max-w-4xl flex-col justify-center"
          aria-hidden={!racing}
          inert={!racing}
        >
          <div className="text-center">
            <p className="text-sm font-medium text-white/80">
              Official result ceremony
            </p>
            <h2 className="reveal-race-title mt-2 text-2xl font-bold sm:text-4xl">
              {stage === "locked"
                ? "Verified totals locked"
                : stage === "final"
                  ? "Final stretch"
                  : "The ballot race is on"}
            </h2>
          </div>
          <div className="relative mt-8">
            <div
              className="absolute -top-6 right-0 flex items-center gap-1.5 text-xs font-semibold text-white/80"
              aria-hidden="true"
            >
              <Flag className="size-3" /> Finish
            </div>
            <div className="race-lanes">
              {ordered.map(({ candidate, votes }) => (
                <article
                  key={candidate.id}
                  ref={(node) => {
                    if (node) laneRefs.current.set(candidate.id, node);
                    else laneRefs.current.delete(candidate.id);
                  }}
                  data-race-candidate={candidate.id}
                  className={`race-lane relative rounded-xl border p-3 sm:p-4 ${stage === "locked" ? "is-finished border-white/60" : "border-white/15"}`}
                >
                  <div className="flex items-center gap-2 sm:gap-4">
                    <span className="w-6 shrink-0 text-center text-lg font-bold">
                      <span className="sr-only">Rank </span>
                      <span data-race-rank />
                    </span>
                    <div className="aspect-[3/4] w-10 shrink-0 overflow-hidden rounded-lg border border-white/20 sm:w-14">
                      <CandidateImage
                        src={candidate.photoUrl}
                        name={candidate.name}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="race-candidate-details">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white/80">
                            Candidate #
                            {String(candidate.ballotNumber).padStart(2, "0")}
                          </p>
                          <h3 className="reveal-name mt-1 text-sm font-bold sm:text-lg">
                            {candidate.name}
                          </h3>
                        </div>
                        <p
                          className="race-total font-bold tabular-nums"
                          aria-hidden="true"
                          style={{
                            minWidth: `${maxVotes.toLocaleString().length + 1}ch`,
                          }}
                        >
                          <span data-race-total>0</span>
                          <span className="ml-1 text-xs font-medium text-white/75">
                            votes
                          </span>
                        </p>
                      </div>
                      <div
                        className="race-track relative mt-3 h-2.5 overflow-hidden rounded-full bg-white/10"
                        aria-hidden="true"
                      >
                        <div className="race-progress h-full rounded-full bg-brand-sky" />
                        <span className="race-finish absolute inset-y-0 right-0" />
                      </div>
                    </div>
                  </div>
                  {stage === "locked" && (
                    <span className="sr-only">Final total: {votes} votes</span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>

        <div
          className="reveal-scene reveal-hero relative grid place-items-center text-center"
          aria-hidden={stage !== "hero"}
          inert={stage !== "hero"}
        >
          {uniqueWinner && (
            <div className="winner-confetti" aria-hidden="true">
              {particles.map((particle) => (
                <i
                  key={particle}
                  style={{ left: `${(particle * 37) % 100}%` } as CSSProperties}
                />
              ))}
            </div>
          )}
          <div className="winner-content relative z-10 w-full max-w-3xl">
            {uniqueWinner && winner && (
              <>
                <div className="mx-auto aspect-[3/4] w-36 overflow-hidden rounded-xl border-2 border-white sm:w-44">
                  <CandidateImage
                    src={winner.candidate.photoUrl}
                    name={winner.candidate.name}
                  />
                </div>
                <Award
                  className="mx-auto mt-4 size-9 text-white"
                  aria-hidden="true"
                />
              </>
            )}
            <p className="mt-4 text-sm font-medium text-white/80">
              {uniqueWinner
                ? "Congratulations to our elected candidate"
                : "Official result"}
            </p>
            <h2 className="reveal-name mt-3 text-3xl font-bold tracking-tight sm:text-5xl">
              {data.isTie
                ? "A tied result"
                : winner
                  ? winner.candidate.name
                  : "No winner determined"}
            </h2>
            {uniqueWinner && winner && (
              <p className="mt-4 text-xl font-bold">
                {winner.votes.toLocaleString()} votes
              </p>
            )}
            {data.isTie && (
              <p className="reveal-name mt-5 text-lg leading-relaxed text-white/80">
                {leaders.map((item) => item.candidate.name).join(" & ")} share
                the highest tally.
              </p>
            )}
            {!winner && !data.isTie && (
              <p className="mt-5 text-lg text-white/80">
                No votes were recorded for a winning candidate.
              </p>
            )}
          </div>
        </div>
      </div>
      <p className="relative mt-4 text-center text-xs leading-5 text-white/75">
        This ceremonial visualization does not represent the chronological order
        in which ballots were cast.
      </p>
    </section>
  );
}
