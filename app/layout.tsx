import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "정비노트 AI",
  description: "나의 정비 경험을 저장하고 다시 찾는 기록 시스템",
  verification: {
    google: "DaIDm98oXI-09ohYJZIw-NtcHocN906ZVf3GB-LYSfQ"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <footer style={{maxWidth:980,margin:"0 auto",padding:"14px 16px 24px",textAlign:"center",color:"#667085",fontSize:12}}>
          <a href="/privacy" style={{color:"#475467",textDecoration:"none",marginRight:16}}>개인정보처리방침</a>
          <a href="/terms" style={{color:"#475467",textDecoration:"none"}}>서비스 이용약관</a>
        </footer>
      </body>
    </html>
  );
}