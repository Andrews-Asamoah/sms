import { Inter } from "next/font/google";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import ModalProvider from "@/providers/modal-provider";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Wesley SMS",
  description: "Wesley SMS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-full w-full flex font-sans antialiased",
          inter.className
        )}>
        <div className="w-full h-full justify-center flex items-center">
          <ModalProvider />
          {children}
        </div>
      </body>
    </html>
  );
}
