import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HR Portal Login",
  description: "Secure access for your HR workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
