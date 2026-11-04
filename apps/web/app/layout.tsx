import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/toast";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/shell";
import { THEME_SCRIPT } from "@/components/theme";

export const metadata: Metadata = {
  title: { default: "RELO | Resources deserve another life", template: "%s | RELO" },
  description: "Find it. Share it. Borrow it. Return it. Reuse it. A hyperlocal community resource-sharing platform.",
  icons: { icon: "/brand/relo-logo.png", apple: "/brand/relo-logo.png" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#061B3A" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body>
        <svg width="0" height="0" aria-hidden focusable="false" style={{ position: "absolute" }}>
          <filter id="liquid-glass" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="7" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="3" result="soft" />
            <feDisplacementMap in="SourceGraphic" in2="soft" scale="26" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        <ToastProvider>
          <StoreProvider>
            <Shell>{children}</Shell>
          </StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
