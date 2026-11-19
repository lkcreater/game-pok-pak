import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pok Pak",
  description: "เกมทุบบล็อก ลูกบอลทวีคูณ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
