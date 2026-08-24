import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { I18nProvider } from "@/lib/i18n";
import { NotificationToast } from "@/components/notification-toast";
import { PageTransition } from "@/components/page-transition";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#16a34a" },
    { media: "(prefers-color-scheme: dark)", color: "#059669" },
  ],
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "RetrouvIt — Retrouvez vos objets perdus",
    template: "%s | RetrouvIt",
  },
  description:
    "RetrouvIt est la plateforme camerounaise qui reconnecte les personnes qui ont perdu des objets avec celles qui les ont trouvés.",
  keywords: [
    "objet perdu",
    "objet trouvé",
    "retrouver",
    "Cameroun",
    "matching",
    "Yaoundé",
    "Douala",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RetrouvIt",
  },
  formatDetection: {
    telephone: true,
    email: true,
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RetrouvIt" />
        <meta name="application-name" content="RetrouvIt" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#16a34a" />
        <meta name="msapplication-TileImage" content="/icons/icon-144x144.png" />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ServiceWorkerRegister />
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <NotificationProvider>
                <PageTransition>
                  {children}
                </PageTransition>
                <NotificationToast />
              </NotificationProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
