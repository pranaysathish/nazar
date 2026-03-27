"use client";
import { useEffect, useState } from "react";

const steps = [
  "Extracting video frames",
  "Running MobileNetV2 classifier",
  "Generating BLIP captions",
  "Building explanation",
];

export default function ProcessingCard() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => Math.min(c + 1, steps.length - 1)), 6000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-10 flex flex-col items-center gap-8">
        {/* Spinner */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#3ecfbb] animate-spin" />
        </div>

        <div className="w-full flex flex-col gap-1">
          <p className="text-sm font-semibold text-white/70 mb-4 text-center">Analyzing your advertisement</p>
          {steps.map((step, i) => (
            <div key={step} className={`flex items-center gap-3 py-1.5 text-sm transition-colors ${i <= current ? "text-white/70" : "text-white/20"}`}>
              <div className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                i < current ? "bg-[#22c55e]" : i === current ? "bg-[#3ecfbb] shadow-[0_0_8px_#3ecfbb80]" : "bg-white/10"
              }`} />
              {step}
            </div>
          ))}
        </div>

        <p className="text-xs text-white/20 text-center">This may take 15–60 seconds</p>
      </div>
    </div>
  );
}
