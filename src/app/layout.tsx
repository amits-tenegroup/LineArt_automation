import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LineArt Automation",
  description: "Transform couple photos into beautiful line art canvases",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
      </body>
    </html>
  );
}
