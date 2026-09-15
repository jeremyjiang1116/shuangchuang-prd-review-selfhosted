import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "高校双创 · 产品协同评审",
  description: "团队署名审阅、划线讨论与产品文档修订。",
  robots: { index: false, follow: false },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
