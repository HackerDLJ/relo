import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RELO | Resources deserve another life",
  description: "Discover, share, borrow and return resources in your community.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
