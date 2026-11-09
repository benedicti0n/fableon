import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { BRAND } from "@fableon/shared";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — AI-native animation studio`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#07080a",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
