import { SWRConfig } from "swr";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { UserProvider } from "../contexts/UserContext";
import { isMobileDevice } from "../utils/device";
import MobileLayout from "../components/layout/MobileLayout";
import DesktopLayout from "../components/layout/DesktopLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicMind | 申论智能批改",
  description: "专业的公考申论 AI 批改平台",
};



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isMobile = await isMobileDevice();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <UserProvider>
          <SWRConfig value={{
            revalidateOnFocus: false,
            revalidateIfStale: true,
            dedupingInterval: 5000,
          }}>
            {isMobile ? (
              <MobileLayout>{children}</MobileLayout>
            ) : (
              <DesktopLayout>{children}</DesktopLayout>
            )}
          </SWRConfig>
        </UserProvider>
      </body>
    </html>
  );
}
