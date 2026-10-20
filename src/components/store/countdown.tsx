"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Live "ends in 05:12:33" timer. Renders nothing until mounted (time is per-visitor). */
export function Countdown({
  endsAt,
  label = "Ends in",
  className,
  onEnd,
}: {
  endsAt: string;
  label?: string;
  className?: string;
  onEnd?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    let ended = false;
    const tick = () => {
      const left = end - Date.now();
      setRemaining(left);
      if (left <= 0 && !ended) {
        ended = true;
        onEnd?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt, onEnd]);

  if (remaining === null) return <span className={cn("invisible", className)}>{label} 00:00:00</span>;
  if (remaining <= 0) return <span className={className}>Deal ended</span>;

  const { days, hours, minutes, seconds } = parts(remaining);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} role="timer" aria-live="off">
      <span>{label}</span>
      <span className="font-mono font-bold tabular-nums">
        {days > 0 && `${days}d `}
        {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </span>
  );
}
