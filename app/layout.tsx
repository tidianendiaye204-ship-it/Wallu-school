import type { Metadata, Viewport } from "next";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wallu School",
  description: "Gestion financière scolaire — paiements, reçus, personnel, caisse",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Wallu School",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F1C30",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
