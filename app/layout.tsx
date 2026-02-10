import type { Metadata } from "next";
import { Indie_Flower } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/navbar";
import Providers from "@/app/providers";

const indieFlower = Indie_Flower({
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nailart AI - High-CTR YouTube Thumbnails",
  description: "Generate click-worthy YouTube thumbnails with AI in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${indieFlower.className} antialiased`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
