"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

const FALLBACK = "/images/branding/placeholder.svg";

/** next/image with a neutral loading background and a fallback if the source fails. */
export function SafeImage({ src, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(!src);
  return (
    <Image
      {...props}
      src={failed ? FALLBACK : src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ backgroundColor: "#F1EBE2", ...props.style }}
    />
  );
}
