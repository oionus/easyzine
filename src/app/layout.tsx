import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EasyZine · 纸间小志工坊 — Web Zine & Risograph Studio",
  description:
    "专为独立出版人、插画师与摄影师打造的在线小志（Zine）排版、48 色 Risograph 孔版印刷模拟、三维翻书预览与折手拼版工坊。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
