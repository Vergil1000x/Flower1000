import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/* export const metadata: Metadata = {
  title: "Simplex Flower Generator - Interactive 3D Generative Art",
  description:
    "Explore and create beautiful procedural flowers using simplex noise in an interactive 3D WebGL experience built with Three.js. Customize parameters, randomize, generate new flowers, and save your creations.",
  keywords:
    "generative art, procedural flower, simplex noise, Three.js, WebGL, interactive 3D art, creative coding",
  authors: [{ name: "Inspired by Jack Rugile" }],
  openGraph: {
    title: "Simplex Flower Generator - Interactive Generative Art",
    description:
      "Generate stunning procedural flowers with simplex noise in real-time 3D. Drag to orbit, tweak parameters, and save your unique creations.",
    type: "website",
    images: [
      {
        url: "/logo.jpg", // Optional: Add an actual screenshot as public/og-image.png for better sharing
        width: 1200,
        height: 630,
        alt: "Procedural flower generated with simplex noise",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Simplex Flower Generator",
    description:
      "Interactive 3D generative art with Three.js and simplex noise",
    images: ["/logo.jpg"],
  },
}; */
export const metadata: Metadata = {
  title: "Flowers",
  description:
    "Eternal Flowers",
  keywords:
    "generative art, procedural flower, simplex noise, Three.js, WebGL, interactive 3D art, creative coding",
  authors: [{ name: "Inspired by Jack Rugile" }],
  openGraph: {
    title: "Flower",
    description:
      "Eternal Flowers",
    type: "website",
    images: [
      {
        url: "/logo.jpg",
        width: 1200,
        height: 630,
        alt: "Procedural Flower",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Flower",
    description:
      "Eternal Flowers",
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
