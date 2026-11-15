import Image from "next/image";
import Link from "next/link";
import { DATASET, KEYWORD_COUNT, METRICS, ORIGINAL, SOURCE_NOTEBOOK } from "@/lib/metrics";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-2">{label}</p>
      <p className="text-3xl font-extrabold tracking-tight text-[#3ecfbb]">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-bold text-white/70">{title}</h2>
      <p className="text-xs text-white/30 mt-0.5 leading-relaxed">{sub}</p>
    </div>
  );
}

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#3ecfbb" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-white/50 w-32 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold w-12 text-right flex-shrink-0" style={{ color }}>{pct}%</span>
    </div>
  );
}

function ClassificationReport() {
  const rows = [
    { name: "Not objectifying", ...METRICS.nonObj },
    { name: "Objectifying", ...METRICS.obj },
  ];
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-5">Classification Metrics (re-run)</p>
      <div className="space-y-4">
        <MetricBar label="Accuracy" value={METRICS.accuracy / 100} />
        <MetricBar label="Precision (OBJ)" value={METRICS.obj.precision} />
        <MetricBar label="Recall (OBJ)" value={METRICS.obj.recall} />
        <MetricBar label="F1 score (OBJ)" value={METRICS.obj.f1} />
        <MetricBar label="ROC-AUC" value={METRICS.auc} />
      </div>

      <table className="w-full mt-6 text-xs">
        <thead>
          <tr className="text-white/25 text-left">
            <th className="font-semibold pb-2">Class</th>
            <th className="font-semibold pb-2 text-right">Precision</th>
            <th className="font-semibold pb-2 text-right">Recall</th>
            <th className="font-semibold pb-2 text-right">F1</th>
            <th className="font-semibold pb-2 text-right">Test frames</th>
          </tr>
        </thead>
        <tbody className="text-white/60">
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-white/[0.06]">
              <td className="py-1.5">{r.name}</td>
              <td className="py-1.5 text-right">{r.precision.toFixed(2)}</td>
              <td className="py-1.5 text-right">{r.recall.toFixed(2)}</td>
              <td className="py-1.5 text-right">{r.f1.toFixed(2)}</td>
              <td className="py-1.5 text-right">{r.support}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-white/[0.06] mt-4 pt-4 text-xs text-white/25 space-y-1">
        <p><span className="text-white/40 font-semibold">Precision:</span> of the frames the model called objectifying, {Math.round(METRICS.obj.precision * 100)}% really were.</p>
        <p><span className="text-white/40 font-semibold">Recall:</span> of all objectifying frames, the model caught {Math.round(METRICS.obj.recall * 100)}%.</p>
        <p><span className="text-white/40 font-semibold">For comparison:</span> {METRICS.accuracyBeforeFineTuning}% before fine-tuning; {METRICS.baseline}% by always answering &quot;not objectifying&quot;.</p>
      </div>
    </div>
  );
}

function ConfusionMatrix() {
  const { tn, fp, fn, tp } = METRICS.cm;
  const total = tn + fp + fn + tp;
  const cell = (val: number, label: string, good: boolean) => (
    <div className={`${good ? "bg-green-950/40 border-green-800/30" : "bg-red-950/30 border-red-800/20"} border rounded-xl p-4 text-center`}>
      <div className={`text-3xl font-extrabold ${good ? "text-green-400" : "text-red-400"} mb-1`}>{val}</div>
      <div className="text-[11px] font-semibold text-white/60">{label}</div>
    </div>
  );
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-1">Confusion Matrix (re-run)</p>
      <p className="text-xs text-white/25 mb-5">On {total} test frames · {tn + tp} correct ({METRICS.accuracy}%)</p>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
        <div />
        <div className="text-[10px] text-white/30 text-center uppercase tracking-wider">Predicted: not obj.</div>
        <div className="text-[10px] text-white/30 text-center uppercase tracking-wider">Predicted: objectifying</div>

        <div className="text-[10px] text-white/30 uppercase tracking-wider pr-1 text-right leading-tight">Actual:<br />not obj.</div>
        {cell(tn, "True negative", true)}
        {cell(fp, "False positive", false)}

        <div className="text-[10px] text-white/30 uppercase tracking-wider pr-1 text-right leading-tight">Actual:<br />objectifying</div>
        {cell(fn, "False negative", false)}
        {cell(tp, "True positive", true)}
      </div>
    </div>
  );
}

function ImageCard({ title, note, value, src, alt, width, height }: {
  title: string; note: string; value?: string; src: string; alt: string; width: number; height: number;
}) {
  return (
    <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4 gap-4">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-0.5">{title}</p>
          <p className="text-xs text-white/25">{note}</p>
        </div>
        {value && <span className="text-2xl font-extrabold text-[#3ecfbb] flex-shrink-0">{value}</span>}
      </div>
      <div className="bg-white rounded-xl p-2">
        <Image src={src} alt={alt} width={width} height={height} className="w-full h-auto" />
      </div>
    </div>
  );
}

function PipelineViz() {
  const steps = [
    { icon: "🎬", label: "Video Input", desc: "Upload a file or paste a YouTube link" },
    { icon: "🖼", label: "Frame Extraction", desc: "OpenCV · up to 30 evenly spaced frames · 224×224 · ÷255" },
    { icon: "🔍", label: "Blur Check", desc: "Laplacian variance > 100 marks a frame as sharp" },
    { icon: "🧠", label: "MobileNetV2", desc: "Fine-tuned (last 20 layers) · sigmoid score per frame" },
    { icon: "🔥", label: "Grad-CAM", desc: "Heat map of the regions behind each top frame's score" },
    { icon: "📝", label: "BLIP Captioner", desc: "A caption for each of the 5 highest-scoring frames" },
    { icon: "🔑", label: "Keyword Score", desc: `M(C) over ${KEYWORD_COUNT} objectification keywords` },
    { icon: "📊", label: "Decision", desc: "Average ≥ 50% and at least one sharp frame → objectifying" },
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
  const n = (x: number) => x.toLocaleString("en-US");
  const details = [
    { label: "Total Video Ads", val: `${ORIGINAL.ads}` },
    { label: "Objectifying Ads", val: `${ORIGINAL.objAds}` },
    { label: "Non-Objectifying Ads", val: `${ORIGINAL.nonObjAds}` },
    { label: "Frames (after cleaning)", val: n(ORIGINAL.frames) },
    { label: "Split (frames)", val: `${n(ORIGINAL.train)} train · ${ORIGINAL.val} val · ${ORIGINAL.test} test` },
    { label: "Frame Size", val: "224 × 224 px" },
    { label: "Base Model", val: "MobileNetV2 (ImageNet)" },
    { label: "Classifier Head", val: "GAP → Dense 256 → Dropout 0.5 → Sigmoid" },
    { label: "Training", val: "20 epochs frozen (Adam 1e-3) + 10 epochs fine-tuning" },
    { label: "Fine-Tuning", val: "Last 20 layers · Adam 1e-5 · batch 32" },
    { label: "Explainability", val: "Grad-CAM heat maps + BLIP captions" },
    { label: "Decision Threshold", val: "0.5 (50%)" },
  ];

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

        {/* 1. The model the application uses */}
        <SectionTitle
          title="Deployed model"
          sub={`The model this application runs. Trained in ${ORIGINAL.notebook} and tested on ${ORIGINAL.test} frames it never saw during training.`}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard label="Test Accuracy" value={`${ORIGINAL.accuracy}%`} sub={`${ORIGINAL.test} held-out test frames`} />
          <StatCard label="Before Fine-Tuning" value={`${ORIGINAL.accuracyBeforeFineTuning}%`} sub="Frozen MobileNetV2, 20 epochs" />
          <StatCard label="Dataset" value={`${ORIGINAL.ads} Ads`} sub={`${ORIGINAL.objAds} OBJ · ${ORIGINAL.nonObjAds} Non-OBJ · ${n(ORIGINAL.frames)} frames`} />
          <StatCard label="Parameters" value="2.59 M" sub="328 K trained in stage 1" />
        </div>
        <div className="mb-12">
          <ImageCard title="Training Curves" note={`From ${ORIGINAL.notebook} · dashed line: fine-tuning starts`}
            src="/metrics/training_curves_original.png" width={1584} height={652}
            alt="Training and validation accuracy and loss over 30 epochs; fine-tuning starts after epoch 20 and validation accuracy ends at 86%" />
        </div>

        {/* 2. Detailed evaluation from the reproducible re-run */}
        <SectionTitle
          title="Detailed evaluation · reproducible re-run"
          sub={`The original split was not saved, so per-class metrics and curves come from a re-run of the same design with a saved split (${SOURCE_NOTEBOOK}): all ${DATASET.ads} ads, ${n(DATASET.frames)} automatically cleaned frames, ${n(DATASET.test)} test frames.`}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <StatCard label="Frame Accuracy" value={`${METRICS.accuracy}%`} sub={`${n(DATASET.test)} test frames`} />
          <StatCard label="Per-Ad Accuracy" value={`${METRICS.adLevelAccuracy.toFixed(1)}%`} sub={`${Math.round(METRICS.adLevelAccuracy * DATASET.ads / 100)} of ${DATASET.ads} ads, averaged test frames`} />
          <StatCard label="ROC-AUC" value={METRICS.auc.toFixed(2)} sub={`Average precision ${METRICS.averagePrecision.toFixed(2)}`} />
          <StatCard label="F1 Score (OBJ)" value={METRICS.obj.f1.toFixed(2)} sub={`Macro-average F1 ${METRICS.macroF1.toFixed(2)}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ClassificationReport />
          <ConfusionMatrix />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <ImageCard title="ROC Curve" note={`From ${SOURCE_NOTEBOOK}`} value={`AUC ${METRICS.auc.toFixed(2)}`}
            src="/metrics/roc_curve.png" width={707} height={647}
            alt={`ROC curve of the re-run model on the test frames, area under the curve ${METRICS.auc}`} />
          <ImageCard title="Precision-Recall Curve" note={`From ${SOURCE_NOTEBOOK}`} value={`AP ${METRICS.averagePrecision.toFixed(2)}`}
            src="/metrics/pr_curve.png" width={707} height={647}
            alt={`Precision-recall curve of the re-run model on the test frames, average precision ${METRICS.averagePrecision}`} />
        </div>

        {/* 3. How it works */}
        <SectionTitle title="How it works" sub="The steps the application runs on every video, and the training set-up of the deployed model." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <PipelineViz />

          <div className="bg-[#0a0a0a] border border-white/[0.07] rounded-2xl p-6">
            <p className="text-[10px] font-bold tracking-widest uppercase text-white/20 mb-4">Dataset &amp; Training Details</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 text-sm">
              {details.map(({ label, val }) => (
                <div key={label}>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-1">{label}</p>
                  <p className="font-semibold text-white/70">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs text-white/25 leading-relaxed">
          Accuracy, precision, recall and the curves are per frame, with a 0.5 threshold. Both runs split the frames
          80/20 at random, so frames of the same advertisement can appear in training and in testing. The per-ad figure
          averages each advertisement&apos;s test frames. The whole-video verdict on the dashboard averages the scores of
          up to 30 frames.
        </p>
      </div>

      <footer className="border-t border-white/5 mt-10 py-6 text-center text-xs text-white/20">
        nazar · MobileNetV2 + Grad-CAM + BLIP · Explainable AI for Gender Fairness
      </footer>
    </main>
  );
}
