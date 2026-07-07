import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import "./globals.css";

/**
 * Global metadata for the POC.
 * Includes manifest and mobile app metadata for PWA behavior.
 */
export const metadata: Metadata = {
  title: "Pools 3D Studio POC",
  description:
    "A premium 3D pool design proof of concept with PWA and AR direction.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/pools-3d-icon.svg",
    apple: "/icons/pools-3d-icon.svg",
  },
  appleWebApp: {
    capable: true,
    title: "Pools 3D",
    statusBarStyle: "black-translucent",
  },
};

/**
 * Viewport metadata controls mobile browser chrome color and safe areas.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#07111F",
};

/**
 * Root layout wraps every page in the app.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
