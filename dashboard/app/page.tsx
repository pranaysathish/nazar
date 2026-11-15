"use client";
import { useState } from "react";
import Header from "@/components/Header";
import HeroBanner from "@/components/HeroBanner";
import UploadSection from "@/components/UploadSection";
import ProcessingCard from "@/components/ProcessingCard";
import ResultsDashboard from "@/components/ResultsDashboard";
import { ORIGINAL } from "@/lib/metrics";

export type TopFrame = {
  frame_index: number;     // position among the sampled frames (0-based)
  time_sec: number;        // time in the video
  image_b64: string;       // JPEG
  heatmap_b64: string;     // JPEG, Grad-CAM overlay
  caption: string;         // BLIP caption
  score: number;           // 0-100
  keywords: string[];      // objectification keywords found in the caption
  keyword_score: number;   // M(C) = matched / 17
  flagged: boolean;        // at least one keyword found
  sharp: boolean;          // passed the blur check
  selected: boolean;       // score > 50% and sharp
};

export type AnalysisResult = {
  score: number;                  // S_avg, 0-100
  verdict: "OBJECTIFYING" | "SAFE";
  confidence: number;             // S_avg x sharp frames / 30, 0-100
  frames_analyzed: number;
  frames_sharp: number;
  frames_above_threshold: number;
  frames_selected: number;
  frame_scores: number[];         // every sampled frame, in time order
  frame_sharp: boolean[];
  processing_time: number;
  top_frames: TopFrame[];
  explanation: string;
};

const API = "http://127.0.0.1:5000";

export default function Home() {
  const [stage, setStage] = useState<"idle" | "processing" | "results">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function analyzeFile(file: File) {
    setError(null);
    setStage("processing");
    try {
      const form = new FormData();
      form.append("video", file);
      const res = await fetch(`${API}/predict`, { method: "POST", body: form });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || `Server error ${res.status}`);
      }
      setResult(await res.json());
      setStage("results");
    } catch (e: unknown) {
      setStage("idle");
      setError(e instanceof Error && e.message.includes("fetch")
        ? "Cannot connect to backend. Run: python app.py in the backend folder."
        : e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function analyzeYouTube(url: string) {
    setError(null);
    setStage("processing");
    try {
      const res = await fetch(`${API}/predict-youtube`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || `Server error ${res.status}`);
      }
      setResult(await res.json());
      setStage("results");
    } catch (e: unknown) {
      setStage("idle");
      setError(e instanceof Error && e.message.includes("fetch")
        ? "Cannot connect to backend. Run: python app.py in the backend folder."
        : e instanceof Error ? e.message : "Unknown error");
    }
  }

  function reset() {
    setStage("idle");
    setResult(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-black">
      <Header />
      <HeroBanner />

      <div className="max-w-6xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3 text-red-400 text-sm">
            <span className="mt-0.5">⚠</span>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-300 text-lg leading-none">×</button>
          </div>
        )}

        {stage === "idle" && (
          <UploadSection onFile={analyzeFile} onYouTube={analyzeYouTube} />
        )}
        {stage === "processing" && <ProcessingCard />}
        {stage === "results" && result && (
          <ResultsDashboard result={result} onReset={reset} />
        )}
      </div>

      <footer className="border-t border-white/5 mt-16 py-6 text-center text-xs text-white/20">
        nazar &nbsp;·&nbsp; MobileNetV2 + Grad-CAM + BLIP &nbsp;·&nbsp; Dataset: {ORIGINAL.ads} ads, {ORIGINAL.frames.toLocaleString("en-US")} frames &nbsp;·&nbsp; Test accuracy {ORIGINAL.accuracy}% ({ORIGINAL.test} frames)
      </footer>
    </main>
  );
}
