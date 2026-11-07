"use client";

import { useEffect, useRef } from "react";
import { clsx } from "clsx";

type Props = React.HTMLAttributes<HTMLElement> & { delay?: number; as?: "div" | "section" | "li" };

/**
 * Fades and lifts its content into view the first time it scrolls on screen. Elements already on
 * screen at load are left alone, so nothing flickers and content stays visible without JS.
 */
export function Reveal({ children, className, delay = 0, as: Tag = "div", style, ...rest }: Props) {
  const el = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    if (node.getBoundingClientRect().top < window.innerHeight) return;
    node.dataset.pending = "true";
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          node.dataset.shown = "true";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={el as never} className={clsx("reveal", className)} style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }} {...rest}>
      {children}
    </Tag>
  );
}
