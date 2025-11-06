import "./globals.css";
import type { Metadata } from "next";
import { Nunito } from "next/font/google";

export const metadata: Metadata = {
  title: "Phonologische Schleife",
  description: "Drei kurze Arbeitsgedächtnis-Tests für das Seminar.",
};

// Nunito laden (du kannst subsets/weights noch erweitern)
const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700"], // normal, semibold, bold
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className={nunito.className}>{children}</body>
    </html>
  );
}
