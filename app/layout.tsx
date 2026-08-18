import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Intelligence Assistant",
  description: "A resume-to-job comparison assistant with job-scoped retrieval.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
