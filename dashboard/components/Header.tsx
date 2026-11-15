import Link from "next/link";
import NazarMark from "@/components/NazarMark";
import { ORIGINAL } from "@/lib/metrics";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-[60px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <NazarMark size={28} />
          <span className="text-sm tracking-tight">
            <span className="font-bold text-white">nazar</span>
            <span className="hidden sm:inline">
              <span className="text-white/25"> · </span>
              <span className="font-semibold text-white/60">Objectification Detector</span>
            </span>
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
