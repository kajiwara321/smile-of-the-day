import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smile of the Day",
  description: "Smiles from around the world, visualized on a globe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
