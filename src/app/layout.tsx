import "~/styles/globals.css";

import { type Metadata } from "next";
import { Wix_Madefor_Text } from "next/font/google";

export const metadata: Metadata = {
  title: "Tetra Face",
  description: "Real-time multiplayer tetris web app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const wixmadefortext = Wix_Madefor_Text({
  subsets: ["latin"],
  variable: "--font-wixmadefortext",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${wixmadefortext.variable}`}>
      {/* <head>
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head> */}
      <body className="dark">{children}</body>
    </html>
  );
}
