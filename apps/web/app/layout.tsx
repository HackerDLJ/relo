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
        <ToastProvider>
          <StoreProvider>
            <Shell>{children}</Shell>
          </StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
