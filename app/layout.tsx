import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "./providers";
import { NotificationProvider } from "./components/NotificationProvider";

export const metadata: Metadata = {
  title: "Baby & Mom Care",
  description: "Real-time baby care tracking",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#3b82f6" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <NotificationProvider>
          <SessionProvider>{children}</SessionProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
