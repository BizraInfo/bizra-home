import type { Metadata } from "next";
import { Playfair_Display, Inter, Amiri, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "BIZRA — The Seed of Sovereign Intelligence",
  description:
    "Born from people, not from a lab. A human-first AI ecosystem that turns intention into verified, ethical, meaningful action — built by one person over three years, every single day. Live proof, sealed receipts, no claims. Humanity is not the fuel; humanity is the infrastructure.",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${playfair.variable} ${inter.variable} ${amiri.variable} ${plexMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        {children}
        <Toaster theme="dark" position="bottom-right" offset={16} />
      </body>
    </html>
  );
}
