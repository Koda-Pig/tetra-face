import "~/styles/globals.css";
import { type Metadata } from "next";
import Script from "next/script";
import { Outfit } from "next/font/google";
import { Silkscreen } from "next/font/google";
import { GameInPlayProvider } from "~/contexts/gameInPlayContext";
import { Toaster } from "~/components/ui/sonner";

export const metadata: Metadata = {
  title: "Tetrus",
  description: "Real-time multiplayer tetris web app",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: "/favicon-32x32.png",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: "/favicon-16x16.png",
    },
    { rel: "apple-touch-icon", sizes: "180x180", url: "/apple-touch-icon.png" },
  ],
  manifest: "/site.webmanifest",
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
      <head>
        {/* <script
          crossOrigin="anonymous"
          src="//unpkg.com/react-scan/dist/auto.global.js"
        /> */}
        <Script
          id="GA-tag-manager"
          strategy="afterInteractive"
          src="https://www.googletagmanager.com/gtag/js?id=G-QSRCNREBCN"
        ></Script>
        <Script strategy="afterInteractive" id="GA-script">
          {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-QSRCNREBCN');
          `}
        </Script>
      </head>
      <body className="dark">
        <GameInPlayProvider>{children}</GameInPlayProvider>
        <Toaster />
      </body>
    </html>
  );
}
