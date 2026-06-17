import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppLayout from "@/components/layout/app-layout";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: "Ozion Chat AI - WhatsApp + CRM + IA",
  description: "Plataforma completa para WhatsApp, CRM, IA, Fluxos, Voz, Analytics, CTWA e Integrações",
  applicationName: "Ozion",
  appleWebApp: {
    capable: true,
    title: "Ozion",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/apple-touch-icon.svg",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased dark">
      <body className="min-h-full bg-zinc-950">
        <AuthProvider>
          <AppLayout>{children}</AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
