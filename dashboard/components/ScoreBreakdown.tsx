"use client";
import { useState, type CSSProperties } from "react";

interface Props {
  frameScores: number[]; // every sampled frame, in video order (0-100)
  frameSharp: boolean[]; // passed the blur check
  avgScore: number;
  framesAboveThreshold: number;
  framesSharp: number;
}

export default function ScoreBreakdown({ frameScores, frameSharp, avgScore, framesAboveThreshold, framesSharp }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const n = frameScores.length;
  const anyBlurry = frameSharp.some((s) => !s);
  // Tooltip position: centred on the bar, but pinned to the bar's left / right edge near the
  // ends of the chart so it never runs off the card (also on narrow screens).
  // (The vertical lift comes from the -translate-y-full class; only shift sideways here.)
  const tipStyle: CSSProperties =
    active === null
      ? {}
      : active < n / 4
        ? { left: `${(active / n) * 100}%` }
        : active >= (3 * n) / 4
          ? { right: `${((n - active - 1) / n) * 100}%` }
          : { left: `${((active + 0.5) / n) * 100}%`, transform: "translateX(-50%)" };

  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">Score Breakdown</p>
          <p className="text-xs text-white/30 mt-0.5">How the {avgScore}% was calculated</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/25">Average of</span>
          <span className="text-xs text-[#3ecfbb] font-semibold ml-1">{n} frame scores</span>
        </div>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
        {[
          { step: "01", label: "Frame Extraction", desc: "Up to 30 evenly spaced frames, resized to 224×224" },
          { step: "02", label: "MobileNetV2 Scoring", desc: "Each frame gets a 0–100% objectification score" },
          { step: "03", label: "Average → Decision", desc: "Average ≥ 50% (with at least one sharp frame) = objectifying" },
        ].map(({ step, label, desc }) => (
          <div key={step} className="bg-[#111] rounded-xl p-4 border border-white/[0.05]">
            <div className="text-[10px] font-black text-[#3ecfbb]/40 mb-1 tracking-widest">{step}</div>
            <div className="text-xs font-semibold text-white/70 mb-1">{label}</div>
            <div className="text-[11px] text-white/30 leading-snug">{desc}</div>
          </div>
        ))}
      </div>

      {/* Per-frame chart */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-4">
        Score of every sampled frame, in video order
      </p>
      <div className="flex gap-2">
        {/* y-axis */}
        <div className="relative h-40 w-9 flex-shrink-0 text-[10px] text-white/25" aria-hidden="true">
          <span className="absolute right-0 top-0 -translate-y-1/2">100%</span>
          <span className="absolute right-0 top-1/2 -translate-y-1/2">50%</span>
          <span className="absolute right-0 bottom-0 translate-y-1/2">0%</span>
        </div>

        <div className="relative flex-1 min-w-0">
          <div className="relative h-40 border-b border-white/10">
            {/* solid hairline at 100% */}
            <div className="absolute inset-x-0 top-0 border-t border-white/[0.05]" aria-hidden="true" />
            {/* the decision threshold is dashed because it is a threshold, not a gridline */}
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/30 z-10 pointer-events-none" aria-hidden="true" />
            {/* average line */}
            <div
              className="absolute inset-x-0 border-t-2 border-white/70 z-10 pointer-events-none"
              style={{ bottom: `${avgScore}%` }}
              aria-hidden="true"
            />

            {/* bars: one per frame; the whole column is the hover / focus target */}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {frameScores.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative flex-1 h-full flex items-end outline-none rounded-sm focus-visible:ring-1 focus-visible:ring-[#3ecfbb]/60"
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`Frame ${i + 1}: ${s}%${frameSharp[i] ? "" : ", failed the blur check"}`}
                >
                  <span
                    className="block w-full rounded-t-[4px] transition-opacity"
                    style={{
                      height: `${Math.max(s, 1)}%`,
                      background: "#3ecfbb",
                      opacity: frameSharp[i] ? (active === i ? 1 : 0.75) : 0.25,
                    }}
                  />
                </button>
              ))}
            </div>

            {/* tooltip */}
            {active !== null && (
              <div
                className="absolute -top-2 z-20 -translate-y-full pointer-events-none bg-[#1a1a1a] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white/70 whitespace-nowrap"
                style={tipStyle}
              >
                Frame {active + 1} · <span className="font-bold text-white">{frameScores[active]}%</span> ·{" "}
                {frameSharp[active] ? "sharp" : "failed blur check"}
              </div>
            )}
          </div>

          {/* x-axis */}
          <div className="flex justify-between text-[10px] text-white/25 mt-1.5" aria-hidden="true">
            <span>Frame 1</span>
            <span>Frame {n}</span>
          </div>
        </div>
      </div>

      {/* Key for the two lines (direct labels) */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-[11px] text-white/40">
        <span className="flex items-center gap-2">
          <span className="inline-block w-5 border-t-2 border-white/70" /> Average {avgScore}%
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-5 border-t border-dashed border-white/40" /> 50% threshold
        </span>
        {anyBlurry && (
          <span className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-[2px] bg-[#3ecfbb] opacity-25" /> Failed the blur check
          </span>
        )}
      </div>
      <p className="text-xs text-white/35 mt-3">
        {framesAboveThreshold} of {n} frames scored above 50% · {framesSharp} of {n} passed the blur check
      </p>

      {/* Table view of the same numbers */}
      <details className="mt-4 text-xs text-white/40">
        <summary className="cursor-pointer select-none hover:text-white/60">Show every frame score as a table</summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-x-6 gap-y-1">
          {frameScores.map((s, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="text-white/25">Frame {i + 1}</span>
              <span className="text-white/60">
                {s}%{frameSharp[i] ? "" : " · blurry"}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
