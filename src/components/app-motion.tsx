import { useRef } from "react";
import { useLocation } from "react-router-dom";
import { gsap, useGSAP } from "@/lib/motion";

const introSessionKey = "himti-intro-seen";

export function AppOpening() {
  const { pathname } = useLocation();
  const intro = useRef<HTMLDivElement>(null);
  const introMark = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const target = document.querySelector<HTMLElement>(
          '[data-himti-brand-target="navbar"]',
        );
        let seen = false;
        try {
          seen = Boolean(sessionStorage.getItem(introSessionKey));
        } catch {
          // Storage can be unavailable in privacy-restricted browsers.
        }
        if (!intro.current || !introMark.current || !target || seen) return;

        const targetPosition = () => {
          const bounds = target.getBoundingClientRect();
          return {
            x: bounds.left + bounds.width / 2 - window.innerWidth / 2,
            y: bounds.top + bounds.height / 2 - window.innerHeight / 2,
            scale: bounds.width / 92,
          };
        };
        const timeline = gsap.timeline({
          defaults: { ease: "power3.inOut" },
          onComplete: () => {
            try {
              sessionStorage.setItem(introSessionKey, "1");
            } catch {
              // The completed animation does not depend on storage access.
            }
          },
        });

        gsap.set(intro.current, { autoAlpha: 1 });
        gsap.set(target, { autoAlpha: 0 });
        timeline
          .to(introMark.current, {
            rotation: 360,
            duration: 0.5,
            ease: "power2.out",
          })
          .to(
            introMark.current,
            {
              x: () => targetPosition().x,
              y: () => targetPosition().y,
              scale: () => targetPosition().scale,
              duration: 0.42,
              onComplete: () => gsap.set(introMark.current, targetPosition()),
            },
            "-=.05",
          )
          .to(target, { autoAlpha: 1, duration: 0.12 }, "-=.12")
          .to(intro.current, { autoAlpha: 0, duration: 0.18 }, "-=.1");
      });

      return () => media.revert();
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return (
    <div className="brand-intro" ref={intro} aria-hidden="true">
      <div className="brand-intro-mark" ref={introMark}>
        <img src="/logo-himti.png" width={92} height={92} alt="" />
      </div>
    </div>
  );
}

export function AppLoading({ label }: { label: string }) {
  return (
    <div
      className="app-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <img src="/logo-himti.png" width={72} height={72} alt="" />
      <strong>{label}</strong>
    </div>
  );
}
