export default function HeroBanner() {
  return (
    <div className="px-6 pt-6">
      <div className="grain relative max-w-6xl mx-auto rounded-2xl overflow-hidden border border-white/[0.05]"
        style={{
          background: `
            radial-gradient(ellipse 85% 110% at -8% -12%, rgba(180,220,215,0.28) 0%, rgba(90,165,155,0.16) 30%, transparent 62%),
            radial-gradient(ellipse 50% 65% at 6% 14%, rgba(50,138,126,0.20) 0%, rgba(25,92,82,0.09) 50%, transparent 72%),
            radial-gradient(ellipse 65% 80% at 94% 98%, rgba(4,9,11,1.0) 0%, rgba(5,16,18,0.97) 28%, rgba(10,28,30,0.78) 52%, transparent 78%),
            radial-gradient(ellipse 90% 48% at 52% 62%, rgba(15,30,33,0.50) 0%, transparent 68%),
            linear-gradient(148deg, #0c1917 0%, #040c0b 42%, #030809 100%)
          `
        }}
      >
        <div className="relative z-10 px-14 py-16">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[#3ecfbb] bg-[#3ecfbb]/10 border border-[#3ecfbb]/25 px-4 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecfbb] animate-pulse" />
            Explainable AI · Gender Fairness in Advertising
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1] text-[#f0f0f0] mb-4">
            Detect Objectification<br />
            <span className="text-[#3ecfbb]">in Video Advertisements</span>
          </h1>
          <p className="max-w-lg text-[15px] text-white/45 leading-relaxed">
            Upload a video ad or paste a YouTube link. The model samples 30 frames across the
            video, scores each one, and explains the result with Grad-CAM heat maps and BLIP captions.
          </p>
        </div>
      </div>
    </div>
  );
}
