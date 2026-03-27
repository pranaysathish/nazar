"use client";

interface Frame {
  score: number;
  caption: string;
  flagged: boolean;
}

interface Props {
  frames: Frame[];
  avgScore: number;
}

function getColor(score: number) {
  if (score >= 70) return { bar: "#ef4444", text: "text-red-400" };
  if (score >= 50) return { bar: "#f97316", text: "text-orange-400" };
  if (score >= 30) return { bar: "#f59e0b", text: "text-amber-400" };
  return { bar: "#22c55e", text: "text-green-400" };
}

export default function ScoreBreakdown({ frames, avgScore }: Props) {
  const sorted = [...frames].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/25">Score Breakdown</p>
          <p className="text-xs text-white/30 mt-0.5">How the {avgScore}% was calculated</p>
        </div>
        <div className="text-right">
          <span className="text-xs text-white/25">Average of</span>
          <span className="text-xs text-[#3ecfbb] font-semibold ml-1">{frames.length} frame scores</span>
        </div>
      </div>

      {/* How it works explainer */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { step: "01", label: "Frame Extraction", desc: "Video is split into up to 30 evenly-spaced frames" },
          { step: "02", label: "MobileNetV2 Scoring", desc: "Each frame gets a 0–100% objectification score" },
          { step: "03", label: "Average → Final Score", desc: "All frame scores are averaged for the final result" },
        ].map(({ step, label, desc }) => (
          <div key={step} className="bg-[#111] rounded-xl p-4 border border-white/[0.05]">
            <div className="text-[10px] font-black text-[#3ecfbb]/40 mb-1 tracking-widest">{step}</div>
            <div className="text-xs font-semibold text-white/70 mb-1">{label}</div>
            <div className="text-[11px] text-white/30 leading-snug">{desc}</div>
          </div>
        ))}
      </div>

      {/* Per-frame bar chart */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20 mb-3">Top Frames by Score</p>
        {sorted.map((frame, i) => {
          const { bar, text } = getColor(frame.score);
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] text-white/25 w-14 flex-shrink-0">Frame {i + 1}</span>
              <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${frame.score}%`,
                    background: bar,
                    opacity: 0.85,
                    animation: `growBar 0.8s ease ${i * 0.06}s both`,
                  }}
                />
              </div>
              <span className={`text-[11px] font-bold w-10 text-right flex-shrink-0 ${text}`}>
                {frame.score}%
              </span>
              {frame.flagged && (
                <span className="text-[9px] font-bold bg-red-950/60 text-red-400 border border-red-800/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  FLAGGED
                </span>
              )}
            </div>
          );
        })}

        {/* Average line */}
        <div className="border-t border-white/[0.06] pt-3 mt-3 flex items-center gap-3">
          <span className="text-[10px] font-bold text-white/40 w-14 flex-shrink-0">Average</span>
          <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${avgScore}%`, background: getColor(avgScore).bar }}
            />
          </div>
          <span className={`text-[11px] font-black w-10 text-right flex-shrink-0 ${getColor(avgScore).text}`}>
            {avgScore}%
          </span>
        </div>
      </div>

      <style jsx>{`
        @keyframes growBar {
          from { width: 0; }
        }
      `}</style>
    </div>
  );
}
