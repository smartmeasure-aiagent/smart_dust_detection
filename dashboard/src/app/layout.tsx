import type { Metadata } from "next";
import { Inter, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Background from "@/components/Background";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const jb = JetBrains_Mono({ variable: "--font-jb", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Smart Dustbin Alert System",
  description: "Live fill-level monitoring for the ESP32 smart dustbin prototype",
  icons: { icon: "/logo-icon.png", shortcut: "/favicon.ico" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${sora.variable} ${jb.variable} font-sans antialiased`}>
        <Background />
        {children}
      </body>
    </html>
  );
}
