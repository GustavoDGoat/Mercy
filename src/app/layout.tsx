import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SLMS - LAUTECH Library",
  description:
    "Secure Library Management System for Ladoke Akintola University of Technology, Ogbomoso",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  try {
    const [{ migrate }, { seedDatabase }] = await Promise.all([
      import("@/lib/migrate"),
      import("@/lib/seed"),
    ])
    await migrate()
    await seedDatabase()
  } catch (e) {
    console.error("[Root] DB init failed:", (e as Error).message)
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
