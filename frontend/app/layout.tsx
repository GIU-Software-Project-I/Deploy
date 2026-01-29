import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/components/theme-provider";
import { GlobalThemeCustomizer } from "@/components/GlobalThemeCustomizer";
import { Toaster } from "sonner";
import { SidebarConfigProvider } from "@/context/sidebar-context";


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HR System | German International University",
  description:
    "A unified, modular HR platform that covers the full employee lifecycle and everyday HR operations in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${outfit.variable} antialiased font-sans`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="system" storageKey="hr-system-theme">
          <SidebarConfigProvider>
            <AuthProvider>
              {children}
              <GlobalThemeCustomizer />
              <Toaster />
            </AuthProvider>
          </SidebarConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
