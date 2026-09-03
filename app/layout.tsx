import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "정비노트 AI",
  description: "나의 정비 경험을 저장하고 다시 찾는 기록 시스템"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}