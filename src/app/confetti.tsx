"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
  opacity: number;
};

const COLORS = [
  "#0078d4", // azure blue
  "#50e6ff", // azure light
  "#ffd700", // gold
  "#ff6b6b", // coral
  "#a8edea", // mint
  "#fed6e3", // pink
  "#c3cfe2", // lavender
  "#fff",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 140 }, () => ({
      x: randomBetween(canvas.width * 0.2, canvas.width * 0.8),
      y: randomBetween(-40, -10),
      vx: randomBetween(-4, 4),
      vy: randomBetween(3, 9),
      angle: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.2, 0.2),
      size: randomBetween(6, 13),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: Math.random() > 0.4 ? "rect" : "circle",
      opacity: 1,
    }));

    let frame = 0;

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      let alive = false;
      for (const p of particles) {
        p.vy += 0.18; // gravity
        p.vx *= 0.995; // air drag
        p.x += p.vx;
        p.y += p.vy;
        p.angle += p.spin;

        // Fade out in the bottom third
        if (p.y > canvas.height * 0.7) {
          p.opacity = Math.max(0, p.opacity - 0.025);
        }

        if (p.y < canvas.height + 20 && p.opacity > 0) alive = true;

        ctx.save();
        ctx.globalAlpha = p.opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      if (alive && frame < 300) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 9999,
      }}
      aria-hidden="true"
    />
  );
}
