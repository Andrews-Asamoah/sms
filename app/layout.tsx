// ================
// app/layout.tsx
// ================
import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeProvider as ColorThemeProvider } from "@/lib/themes/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { BreadcrumbProvider } from "@/lib/breadcrumb-context";
import "./globals.css";

export const metadata: Metadata = {
  title: { template: "%s | Edu-MS", default: "Edu-MS" },
  description: "The best SMS management system",
  appleWebApp: {
    title: "Edu-MS",
    statusBarStyle: "default",
    capable: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" }, // Closest to oklch(0.145 0 0)
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="font-sans h-screen overflow-hidden antialiased"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ColorThemeProvider>
            <BreadcrumbProvider>
              <TooltipProvider>
                <main className="w-full">{children}</main>
                <Toaster />
              </TooltipProvider>
            </BreadcrumbProvider>
          </ColorThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
