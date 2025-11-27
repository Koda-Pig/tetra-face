import "~/styles/globals.css";

import { type Metadata } from "next";
import { Silkscreen } from "next/font/google";

export const metadata: Metadata = {
  title: "Tetra Face",
  description: "Real-time multiplayer tetris web app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const retro_font = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-retro_font",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${retro_font.variable}`}>
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
