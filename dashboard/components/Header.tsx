import Link from "next/link";
import { ORIGINAL } from "@/lib/metrics";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-[#0f1f1e] border border-[#1e3835] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3ecfbb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight text-white/70">
            Objectification Detector
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/model" className="text-[11px] font-medium text-white/30 bg-white/[0.04] border border-white/[0.07] px-3 py-1 rounded-full hover:text-white/60 hover:border-white/20 transition-all">
            Model Info
          </Link>
          <span className="hidden sm:inline text-[11px] font-medium text-white/30 bg-white/[0.04] border border-white/[0.07] px-3 py-1 rounded-full">MobileNetV2 · Grad-CAM · BLIP</span>
          <span title={`Accuracy on ${ORIGINAL.test} held-out test frames`} className="text-[11px] font-medium text-[#3ecfbb] bg-[#3ecfbb]/10 border border-[#3ecfbb]/25 px-3 py-1 rounded-full">{ORIGINAL.accuracy}% Test Accuracy</span>
        </div>
      </div>
    </header>
  );
}
