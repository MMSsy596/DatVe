import type { Metadata } from "next";
import "./globals.css";
import { GoogleProviderWrapper } from "./components/GoogleProviderWrapper";

export const metadata: Metadata = {
  title: "CinePlus Admin",
  description: "Hệ thống quản trị rạp chiếu phim CinePlus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full">
        <GoogleProviderWrapper>{children}</GoogleProviderWrapper>
      </body>
    </html>
  );
}
