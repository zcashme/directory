import { useEffect, useRef, useState } from "react";

export default function useFlightPaths() {
  const [flightPaths, setFlightPaths] = useState([]);
  const flightTimersRef = useRef([]);

  useEffect(() => {
    const buildPath = () => {
      const randPoint = () => ({
        x: 20 + Math.random() * 160,
        y: 15 + Math.random() * 90,
      });
      let start = randPoint();
      let end = randPoint();
      let tries = 0;
      while (tries < 10) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 40 && dist < 140) break;
        start = randPoint();
        end = randPoint();
        tries += 1;
      }
      if (Math.random() < 0.5) {
        const temp = start;
        start = end;
        end = temp;
      }
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const bend = (Math.random() - 0.5) * 60;
      const lift = (Math.random() - 0.5) * 60;
      const ctrl1X = midX + bend;
      const ctrl1Y = midY + lift;
      const ctrl2X = midX - bend;
      const ctrl2Y = midY - lift;
      return `M${start.x} ${start.y} C${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${end.x} ${end.y}`;
    };

    const buildPathEntry = (id) => {
      const duration = 4 + Math.random() * 4;
      const delay = Math.random() * 1.5;
      return {
        id,
        d: buildPath(),
        duration,
        delay,
        dashRatio: 0.12 + Math.random() * 0.12,
      };
    };

    const replacePath = (id) => {
      const nextEntry = buildPathEntry(id);
      setFlightPaths((prev) =>
        prev.map((path) => (path.id === id ? nextEntry : path))
      );
      const gap = 400 + Math.random() * 1400;
      const timeoutId = setTimeout(
        () => replacePath(id),
        (nextEntry.duration + nextEntry.delay) * 1000 + gap
      );
      flightTimersRef.current[id] = timeoutId;
    };

    const initial = Array.from({ length: 3 }, (_, idx) => buildPathEntry(idx));
    setFlightPaths(initial);
    initial.forEach((path) => {
      const gap = 800 + Math.random() * 1600;
      const timeoutId = setTimeout(
        () => replacePath(path.id),
        (path.duration + path.delay) * 1000 + gap
      );
      flightTimersRef.current[path.id] = timeoutId;
    });

    return () => {
      flightTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return flightPaths;
}
