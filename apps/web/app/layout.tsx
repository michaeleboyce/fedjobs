import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import TopBar from "./_components/TopBar";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fedjobs",
  description: "A site to help you apply for federal government jobs!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/fedjobssimpleimage.png" />

      <body className={inter.className}>
        <TopBar />
        <div>{children}</div>
      </body>
    </html>
  );
}
