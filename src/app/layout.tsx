import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "BIZRA — The Seed of Sovereign Intelligence",
  description:
    "Born from people, not from a lab. A human-first AI ecosystem that turns intention into verified, ethical, meaningful action — built by one person over three years, every single day. Live proof, sealed receipts, no claims. Humanity is not the fuel; humanity is the infrastructure.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster theme="dark" position="bottom-right" offset={16} />
      </body>
    </html>
  );
}
