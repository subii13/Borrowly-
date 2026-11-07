"use client";

import { useRef } from "react";
import { clsx } from "clsx";

/**
 * Subtle 3D tilt toward the cursor with a moving light glare. Mouse only — touch devices and
 * reduced-motion users get a static card (handled in CSS via the .tilt rules in globals.css).
 */
export function Tilt({ children, className, max = 6 }: { children: React.ReactNode; className?: string; max?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !el.current) return;
    const node = el.current;
    const r = node.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--rx", `${(0.5 - y) * max}deg`);
      node.style.setProperty("--ry", `${(x - 0.5) * max}deg`);
      node.style.setProperty("--gx", `${x * 100}%`);
      node.style.setProperty("--gy", `${y * 100}%`);
      node.dataset.active = "true";
    });
  };

  const onLeave = () => {
    cancelAnimationFrame(frame.current);
    const node = el.current;
    if (!node) return;
    node.style.setProperty("--rx", "0deg");
    node.style.setProperty("--ry", "0deg");
    delete node.dataset.active;
  };

  return (
    <div ref={el} onPointerMove={onMove} onPointerLeave={onLeave} className={clsx("tilt", className)}>
      {children}
      <span className="tilt-glare" aria-hidden />
    </div>
  );
}
