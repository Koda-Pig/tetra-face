import "~/styles/globals.css";
import { type Metadata } from "next";
import { Outfit } from "next/font/google";
import { Silkscreen } from "next/font/google";
import { GameInPlayProvider } from "~/contexts/gameInPlayContext";

export const metadata: Metadata = {
  title: "Tetra Face",
  description: "Real-time multiplayer tetris web app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const base_font = Outfit({
  subsets: ["latin"],
  variable: "--font-base",
});
const retro_font = Silkscreen({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-retro",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${base_font.variable} ${retro_font.variable}`}>
      {/* <head>
        <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        />
      </head> */}
      <body className="dark">
        <GameInPlayProvider>{children}</GameInPlayProvider>
      </body>
    </html>
  );
}
