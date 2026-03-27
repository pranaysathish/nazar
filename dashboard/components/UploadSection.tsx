"use client";
import { useState, useRef, DragEvent, ChangeEvent } from "react";

interface Props {
  onFile: (file: File) => void;
  onYouTube: (url: string) => void;
}

export default function UploadSection({ onFile, onYouTube }: Props) {
  const [tab, setTab] = useState<"upload" | "youtube">("upload");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ytUrl, setYtUrl] = useState("");
  const [ytError, setYtError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith("video/")) return;
    setSelectedFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }

  function validateYT(url: string) {
    return /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(url);
  }

  function handleAnalyze() {
    if (tab === "upload" && selectedFile) onFile(selectedFile);
    if (tab === "youtube") {
      if (!validateYT(ytUrl)) { setYtError("Please enter a valid YouTube URL"); return; }
      setYtError("");
      onYouTube(ytUrl);
    }
  }

  const canAnalyze = tab === "upload" ? !!selectedFile : ytUrl.trim().length > 0;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Tab toggle */}
      <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.07] p-1 rounded-xl">
        {(["upload", "youtube"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t
                ? "bg-[#111] text-white border border-white/10 shadow"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            {t === "upload" ? "📁  Upload File" : "▶  YouTube Link"}
          </button>
        ))}
      </div>

      {/* Upload Panel */}
      {tab === "upload" && (
        <div
          onClick={() => !selectedFile && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`w-full max-w-2xl border-2 border-dashed rounded-2xl px-10 py-14 flex flex-col items-center gap-3 text-center cursor-pointer transition-all ${
            dragging
              ? "border-[#3ecfbb]/50 bg-[#3ecfbb]/5"
              : selectedFile
              ? "border-[#3ecfbb]/40 bg-[#0a1a18] cursor-default"
              : "border-white/10 bg-[#0a0a0a] hover:border-white/20 hover:bg-[#0e0e0e]"
          }`}
        >
          <input ref={inputRef} type="file" accept="video/*" hidden onChange={handleChange} />
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all ${
            selectedFile ? "bg-[#0d1f1d] border-[#3ecfbb]/30" : "bg-[#111] border-white/10"
          }`}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={selectedFile ? "#3ecfbb" : "#444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
          </div>

          {selectedFile ? (
            <>
              <p className="text-sm font-semibold text-[#3ecfbb]">{selectedFile.name}</p>
              <p className="text-xs text-white/30">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); inputRef.current?.click(); }}
                className="text-xs text-white/30 underline underline-offset-2 hover:text-white/60 mt-1"
              >Change file</button>
            </>
          ) : (
            <>
              <p className="text-base font-semibold text-white/80">Drop your video ad here</p>
              <p className="text-sm text-white/30">or <span className="text-[#3ecfbb] underline underline-offset-2">click to browse</span></p>
              <p className="text-xs text-white/20 mt-1">MP4 · MOV · AVI · MKV · WEBM</p>
            </>
          )}
        </div>
      )}

      {/* YouTube Panel */}
      {tab === "youtube" && (
        <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/[0.08] rounded-2xl p-8 flex flex-col gap-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#1a0000] border border-red-900/40 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff4444">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-white/80">Analyze a YouTube Video</p>
              <p className="text-xs text-white/30">Paste any public YouTube ad URL</p>
            </div>
          </div>
          <input
            type="url"
            value={ytUrl}
            onChange={(e) => { setYtUrl(e.target.value); setYtError(""); }}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-[#3ecfbb]/40 transition-colors"
          />
          {ytError && <p className="text-xs text-red-400">{ytError}</p>}
          <p className="text-xs text-white/20">
            ⚡ The video downloads automatically in the background. May take 10–20s extra.
            Private or age-restricted videos are not supported.
          </p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!canAnalyze}
        className="flex items-center gap-2.5 bg-[#3ecfbb] text-black font-bold text-sm px-8 py-3.5 rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:opacity-85 hover:-translate-y-0.5 active:translate-y-0"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        Analyze Advertisement
      </button>
    </div>
  );
}
