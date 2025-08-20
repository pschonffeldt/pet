import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PetSoft - Pet daycare software",
  description: "Take care of people's pet responsibily with PetSoft",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Add basic styling, layout and font for entire app and website */}
      <body
        className={`${inter.className} text-sm text-zinc-900 bg-[#E5E8Ec] min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
