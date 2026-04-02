import type { Metadata } from "next";
import "./globals.css";
import Navbar from "../app/components/Navbar";

export const metadata: Metadata = {
  title: "GoLedger Kino",
  description: "Catálogo descentralizado de séries na blockchain",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
