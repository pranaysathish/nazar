import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Objectification Detector — Explainable AI",
  description:
    "Explainable AI system for detecting objectification in video advertisements using MobileNetV2 and BLIP.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-black text-[#f0f0f0] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
