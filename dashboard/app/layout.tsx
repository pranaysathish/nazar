import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "nazar · Objectification Detector",
  description:
    "nazar: explainable AI that detects objectification of women in video advertisements, with Grad-CAM heat maps and BLIP captions.",
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
