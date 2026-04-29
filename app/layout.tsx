import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/AppShell";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Neento",
  description: "Practica vocabulario japones en romaji con repeticion espaciada.",
};

export const viewport: Viewport = {
  initialScale: 1,
  themeColor: "#f5f7fb",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
