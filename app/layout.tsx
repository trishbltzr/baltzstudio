import type { Metadata } from "next";
import "../src/index.css";

export const metadata: Metadata = {
  title: "Baltazar Studio — Client Dashboard",
  description: "Your website audit and project management portal — secure, encrypted, your data stays private.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
