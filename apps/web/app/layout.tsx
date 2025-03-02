// File path: apps/web/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./shared/styles/globals.css";
import TopBar from "./shared/components/TopBar";
import { MainNavigation } from "./shared/components/MainNavigation";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Fedjobs",
  description: "A site to help you apply for federal government jobs!",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = getKindeServerSession();
  const authenticated = await isAuthenticated();

  return (
    <html lang="en">
      <link rel="icon" href="/fedjobssimpleimage.png" />
      <body className={inter.className}>
        <TopBar />
        {authenticated && <MainNavigation />}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
