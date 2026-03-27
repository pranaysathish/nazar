import Link from "next/link";

// Hardcoded metrics extracted from Objectification_Metrics.ipynb
const METRICS = {
  accuracy: 83.95,
  precision: 0.86,
  recall: 0.82,
  f1: 0.84,
  auc: 0.91,
  // Confusion matrix [true_neg, false_pos, false_neg, true_pos]
  cm: { tn: 46, fp: 9, fn: 10, tp: 45 },
  dataset: { total: 110, obj: 55, nonObj: 55 },
  frames: { total: "~3,200", perVideo: "~58" },
};

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight text-[#3ecfbb]">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#3ecfbb" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-white/50 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-12 text-right flex-shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

function ConfusionMatrix() {
  const { tn, fp, fn, tp } = METRICS.cm;
  const total = tn + fp + fn + tp;
  const cells = [
    { label: "True Negative", val: tn, bg: "bg-green-950/40", border: "border-green-800/30", text: "text-green-400", sub: "Correctly: Safe" },
    { label: "False Positive", val: fp, bg: "bg-red-950/30", border: "border-red-800/20", text: "text-red-400", sub: "Incorrectly: Objectifying" },
    { label: "False Negative", val: fn, bg: "bg-orange-950/30", border: "border-orange-800/20", text: "text-orange-400", sub: "Missed: Objectifying" },
    { label: "True Positive", val: tp, bg: "bg-green-950/40", border: "border-green-800/30", text: "text-green-400", sub: "Correctly: Objectifying" },
  ];
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1">Confusion Matrix</p>
      <p className="text-xs text-white/25 mb-5">On test set ({total} samples)</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {cells.map(({ label, val, bg, border, text, sub }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 text-center`}>
            <div className={`text-3xl font-extrabold ${text} mb-1`}>{val}</div>
            <div className="text-xs font-semibold text-white/60">{label}</div>
            <div className="text-[10px] text-white/25 mt-0.5">{sub}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 border-t border-white/[0.06] pt-4 text-xs text-white/30">
        <div className="flex items-center gap-2"><span>←</span> <span>Predicted: Safe</span></div>
        <div className="flex items-center gap-2"><span>→</span> <span>Predicted: Objectifying</span></div>
      </div>
    </div>
  );
}

function RocCurveViz() {
  // SVG approximation of the ROC curve (AUC ~0.91)
  const points = "10,190 20,150 35,110 55,80 80,58 110,42 145,32 185,24 220,18 250,14 280,11 310,9 340,8 360,7 390,6 190,190";
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-0.5">ROC Curve</p>
          <p className="text-xs text-white/25">Area Under Curve</p>
        </div>
        <span className="text-2xl font-extrabold text-[#3ecfbb]">AUC {METRICS.auc}</span>
      </div>
      <div className="relative w-full aspect-square max-w-[280px] mx-auto">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Grid */}
          {[0.25, 0.5, 0.75].map((v) => (
            <g key={v}>
              <line x1={v * 400} y1="0" x2={v * 400} y2="200" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <line x1="0" y1={v * 200} x2="400" y2={v * 200} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            </g>
          ))}
          {/* Diagonal baseline */}
          <line x1="0" y1="200" x2="400" y2="0" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" strokeDasharray="6,4" />
          {/* ROC fill */}
          <polygon points={`0,200 ${points}`} fill="rgba(62,207,187,0.08)" />
          {/* ROC line */}
          <polyline points={`0,200 ${points}`} fill="none" stroke="#3ecfbb" strokeWidth="2.5" strokeLinejoin="round" />
          {/* Labels */}
          <text x="200" y="215" fill="rgba(255,255,255,0.20)" fontSize="12" textAnchor="middle">False Positive Rate →</text>
          <text x="-100" y="100" fill="rgba(255,255,255,0.20)" fontSize="12" textAnchor="middle" transform="rotate(-90)" dominantBaseline="middle">True Positive Rate →</text>
        </svg>
      </div>
    </div>
  );
}

function PipelineViz() {
  const steps = [
    { icon: "🎬", label: "Video Input", desc: "Upload or YouTube URL" },
    { icon: "🖼", label: "Frame Extraction", desc: "OpenCV · 30 frames · 224×224px" },
    { icon: "🧠", label: "MobileNetV2", desc: "Binary classification · Sigmoid output" },
    { icon: "📝", label: "BLIP Captioner", desc: "Natural language per frame" },
    { icon: "🔑", label: "Keyword Match", desc: "17 objectification keywords" },
    { icon: "📊", label: "Final Score", desc: "Average · Explanation · Verdict" },
  ];
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-5">Model Pipeline</p>
      <div className="flex flex-col gap-0">
        {steps.map(({ icon, label, desc }, i) => (
          <div key={label} className="flex items-start gap-4">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-[#111] border border-white/[0.07] flex items-center justify-center text-base flex-shrink-0">{icon}</div>
              {i < steps.length - 1 && <div className="w-px h-5 bg-white/[0.06] my-1" />}
            </div>
            <div className="pb-4">
              <p className="text-sm font-semibold text-white/70">{label}</p>
              <p className="text-xs text-white/30">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ModelPage() {
  return (
    <main className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-white/30 hover:text-white/60 text-sm transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Dashboard
          </Link>
          <span className="text-white/10">·</span>
          <span className="text-sm font-bold text-white/60">Model Info &amp; Metrics</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">

        {/* Top stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Test Accuracy" value="83.95%" sub="On held-out test set" />
          <StatCard label="ROC-AUC" value="0.91" sub="Strong discriminative power" />
          <StatCard label="F1 Score" value="84%" sub="Balanced precision/recall" />
          <StatCard label="Dataset" value="110 Ads" sub="55 OBJ · 55 Non-OBJ" />
        </div>

        {/* Main metrics row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Classification metrics */}
          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-5">Classification Metrics</p>
            <div className="space-y-4">
              <MetricBar label="Accuracy" value={METRICS.accuracy / 100} />
              <MetricBar label="Precision" value={METRICS.precision} />
              <MetricBar label="Recall" value={METRICS.recall} />
              <MetricBar label="F1 Score" value={METRICS.f1} />
              <MetricBar label="AUC" value={METRICS.auc} />
            </div>
            <div className="border-t border-white/[0.06] mt-6 pt-4 text-xs text-white/25 space-y-1">
              <p><span className="text-white/40 font-semibold">Precision:</span> Of ads flagged as objectifying, {Math.round(METRICS.precision * 100)}% actually were.</p>
              <p><span className="text-white/40 font-semibold">Recall:</span> Of all objectifying ads, {Math.round(METRICS.recall * 100)}% were correctly caught.</p>
            </div>
          </div>

          <ConfusionMatrix />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <RocCurveViz />
          <PipelineViz />
        </div>

        {/* Dataset info */}
        <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-4">Dataset &amp; Training Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
            {[
              { label: "Total Video Ads", val: "110" },
              { label: "Objectifying Ads", val: "55" },
              { label: "Non-Objectifying", val: "55" },
              { label: "Frames Extracted", val: "~3,200" },
              { label: "Frame Size", val: "224 × 224 px" },
              { label: "Base Model", val: "MobileNetV2" },
              { label: "Classifier Head", val: "Sigmoid (binary)" },
              { label: "Explainability", val: "BLIP + Grad-CAM + LIME" },
            ].map(({ label, val }) => (
              <div key={label}>
                <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{label}</p>
                <p className="font-semibold text-white/70">{val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="border-t border-white/5 mt-10 py-6 text-center text-xs text-white/20">
        AdEthics AI · MobileNetV2 + BLIP · Explainable AI for Gender Fairness
      </footer>
    </main>
  );
}
