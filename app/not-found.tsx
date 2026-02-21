"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ProfileAvatar from "@/ui/profile/ProfileAvatar";

type Vector = { x: number; y: number };

const AVATAR_SIZE = 84;
const BOUNCE_SIZE = { width: AVATAR_SIZE + 6, height: AVATAR_SIZE + 6 };
const SPEED = 3.2;
const CORNER_SEEK_CHANCE = 0.18;

function randomVelocity(): Vector {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.cos(angle) * SPEED,
    y: Math.sin(angle) * SPEED,
  };
}

function centerPosition(viewport: Vector): Vector {
  return {
    x: Math.max((viewport.x - BOUNCE_SIZE.width) / 2, 0),
    y: Math.max((viewport.y - BOUNCE_SIZE.height) / 2, 0),
  };
}

export default function NotFound() {
  const [position, setPosition] = useState<Vector>({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  const velocityRef = useRef<Vector>({ x: SPEED, y: SPEED });
  const positionRef = useRef<Vector>({ x: 0, y: 0 });
  const cornerSeekRef = useRef(false);

  const reset = useCallback(() => {
    if (typeof window === "undefined") return;

    const viewport = { x: window.innerWidth, y: window.innerHeight };
    const nextPosition = centerPosition(viewport);
    const nextVelocity = randomVelocity();

    positionRef.current = nextPosition;
    velocityRef.current = nextVelocity;
    cornerSeekRef.current = false;
    setPosition(nextPosition);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("is-not-found");
    document.body.classList.add("is-not-found");
    reset();
    setMounted(true);

    const onResize = () => {
      const maxX = Math.max(window.innerWidth - BOUNCE_SIZE.width, 0);
      const maxY = Math.max(window.innerHeight - BOUNCE_SIZE.height, 0);
      const clamped = {
        x: Math.min(Math.max(positionRef.current.x, 0), maxX),
        y: Math.min(Math.max(positionRef.current.y, 0), maxY),
      };
      positionRef.current = clamped;
      setPosition(clamped);
    };

    window.addEventListener("resize", onResize);

    let raf = 0;
    const tick = () => {
      const maxX = Math.max(window.innerWidth - BOUNCE_SIZE.width, 0);
      const maxY = Math.max(window.innerHeight - BOUNCE_SIZE.height, 0);

      let nextX = positionRef.current.x + velocityRef.current.x;
      let nextY = positionRef.current.y + velocityRef.current.y;

      let hitX = false;
      let hitY = false;

      if (nextX <= 0 || nextX >= maxX) {
        hitX = true;
        velocityRef.current.x *= -1;
        nextX = Math.min(Math.max(nextX, 0), maxX);
      }

      if (nextY <= 0 || nextY >= maxY) {
        hitY = true;
        velocityRef.current.y *= -1;
        nextY = Math.min(Math.max(nextY, 0), maxY);
      }

      const wallHit = hitX || hitY;
      if (!cornerSeekRef.current && wallHit && Math.random() < CORNER_SEEK_CHANCE) {
        cornerSeekRef.current = true;
      }

      if (cornerSeekRef.current) {
        const targetX = velocityRef.current.x >= 0 ? maxX : 0;
        const targetY = velocityRef.current.y >= 0 ? maxY : 0;

        const dx = targetX - nextX;
        const dy = targetY - nextY;
        const distance = Math.hypot(dx, dy) || 1;
        velocityRef.current.x = (dx / distance) * SPEED;
        velocityRef.current.y = (dy / distance) * SPEED;

        const nearCorner = Math.abs(dx) < SPEED && Math.abs(dy) < SPEED;
        if (nearCorner) {
          nextX = targetX;
          nextY = targetY;
          velocityRef.current.x *= -1;
          velocityRef.current.y *= -1;
          cornerSeekRef.current = false;
        }
      }

      const nextPosition = { x: nextX, y: nextY };
      positionRef.current = nextPosition;
      setPosition(nextPosition);
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      document.documentElement.classList.remove("is-not-found");
      document.body.classList.remove("is-not-found");
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [reset]);

  return (
    <main className="relative min-h-screen w-full overflow-hidden" style={{ backgroundColor: "var(--color-background)" }}>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-5xl font-bold leading-tight" style={{ color: "var(--color-brand-blue)" }}>
            404
          </h1>
          <p className="text-2xl font-semibold leading-tight" style={{ color: "var(--color-brand-blue)" }}>
            This page could not be found.
          </p>
          <div className="pointer-events-auto mt-4 flex justify-center">
            <Link
              href="/"
              className="h-8 md:h-10 flex-shrink-0 flex items-center justify-center bg-green-600 text-white px-4 md:px-6 rounded-full text-sm md:text-base font-semibold shadow-md whitespace-nowrap animate-joinPulse hover:shadow-[0_0_12px_rgba(34,197,94,0.7)] hover:bg-green-500"
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
      {mounted && (
        <button
          type="button"
          onClick={reset}
          aria-label="Reset avatar position"
          className="absolute cursor-pointer"
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          <ProfileAvatar profile={{}} size={AVATAR_SIZE} blink lookAround className="!bg-transparent" />
        </button>
      )}
    </main>
  );
}
