"use client";
import { useEffect, useRef } from "react";
import type { AnalysisResult } from "@/app/page";
import ScoreBreakdown from "@/components/ScoreBreakdown";

interface Props { result: AnalysisResult; onReset: () => void; }

function getScoreColor(score: number) {
  if (score < 30) return "#22c55e";
  if (score < 50) return "#f59e0b";
  if (score < 70) return "#f97316";
  return "#ef4444";
}

function ScoreGauge({ score }: { score: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const color = getScoreColor(score);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const cx = 110, cy = 110, R = 88, lw = 13;
    const start = Math.PI * 0.75, total = Math.PI * 1.5;
    let prog = 0;
    const target = score / 100;
    const dur = 1400;
    const t0 = performance.now();

    function draw(now: number) {
      const elapsed = now - t0;
      prog = Math.min(elapsed / dur, 1);
      const eased = 1 - Math.pow(1 - prog, 3);
      const fill = eased * target;

      ctx.clearRect(0, 0, 220, 220);

      // Track
      ctx.beginPath();
      ctx.arc(cx, cy, R, start, start + total);
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.stroke();

      // Fill
      ctx.beginPath();
      ctx.arc(cx, cy, R, start, start + fill * total);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      ctx.stroke();

      // Glow pass
      ctx.beginPath();
      ctx.arc(cx, cy, R, start, start + fill * total);
      ctx.strokeStyle = color;
      ctx.lineWidth = lw + 10;
      ctx.globalAlpha = 0.07;
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (prog < 1) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
  }, [score, color]);

  return (
    <div className="relative w-[220px] h-[220px]">
      <canvas ref={canvasRef} width={220} height={220} />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[40px] font-extrabold tracking-tighter leading-none" style={{ color }}>{score}%</span>
        <span className="text-[11px] text-white/25 uppercase tracking-widest mt-1">score</span>
      </div>
    </div>
  );
}

export default function ResultsDashboard({ result, onReset }: Props) {
  const { score, verdict, frames_analyzed, processing_time, top_frames, explanation } = result;
  const isObjectifying = verdict === "OBJECTIFYING";
  const verdictColor = isObjectifying ? "#ef4444" : "#22c55e";

  return (
    <div className="flex flex-col gap-4">

      {/* Row 1: Score + Verdict */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4">

        {/* Score card */}
        <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6 flex flex-col items-center gap-2">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">Objectification Score</p>
          <ScoreGauge score={score} />
        </div>

        {/* Verdict card */}
        <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-8 flex flex-col justify-between">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25 mb-4">AI Verdict</p>
          <div>
            <div className="text-4xl mb-2">{isObjectifying ? "⚠️" : "✅"}</div>
            <div className="text-[36px] font-extrabold tracking-tight leading-none mb-2" style={{ color: verdictColor }}>
              {verdict}
            </div>
            <p className="text-sm text-white/35">
              {isObjectifying
                ? `Score of ${score}% exceeds the 50% objectification threshold.`
                : `Score of ${score}% is below the 50% threshold — content appears safe.`}
            </p>
          </div>
          <div className="border-t border-white/[0.06] mt-6 pt-5 grid grid-cols-3 gap-4">
            {[
              { val: frames_analyzed, label: "Frames Analyzed" },
              { val: `${processing_time}s`, label: "Processing Time" },
              { val: "83.95%", label: "Model Accuracy" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <div className="text-xl font-bold text-[#3ecfbb] tracking-tight">{val}</div>
                <div className="text-[10px] text-white/25 tracking-wider uppercase mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">AI Explanation</p>
          <span className="text-[10px] font-semibold text-[#3ecfbb] bg-[#3ecfbb]/10 border border-[#3ecfbb]/25 px-2.5 py-1 rounded-full flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            BLIP Language Model
          </span>
        </div>
        <p className="text-sm text-white/50 leading-relaxed">{explanation}</p>
      </div>

      {/* Score Breakdown */}
      <ScoreBreakdown frames={top_frames} avgScore={score} />

      {/* Top Frames */}
      <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">Top Analyzed Frames</p>
          <div className="flex items-center gap-4 text-[11px] text-white/25">
            <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />Flagged</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5" />Safe</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {top_frames.map((frame, i) => {
            const scoreColor = frame.score >= 70 ? "#ef4444" : frame.score >= 40 ? "#f97316" : "#22c55e";
            return (
              <div key={i} className="flex flex-col gap-2" style={{ animation: `fadeUp 0.4s ease ${i * 0.06}s both` }}>
                <div className="relative rounded-xl overflow-hidden aspect-video border border-white/[0.07] bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${frame.image_b64}`}
                    alt={`Frame ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className="absolute top-1.5 right-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                    style={{ background: `${scoreColor}cc` }}
                  >
                    {frame.score}%
                  </span>
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: frame.flagged ? "#ef4444" : "#22c55e" }} />
                </div>
                <p className="text-[11px] text-white/35 leading-snug line-clamp-2">{frame.caption}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reset button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-white/30 border border-white/10 hover:border-white/20 hover:text-white/60 px-6 py-2.5 rounded-xl transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.69"/>
          </svg>
          Analyze Another Video
        </button>
      </div>

      <style jsx>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
