import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { hasLocale } from "@/lib/i18n/negotiate";
import { THEME_INIT_SCRIPT } from "@/lib/themes/init-script";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shizurak",
  description: "伍泽凯的个人博客 —— Agent Harness 原生",
};

export async function generateStaticParams() {
  return [{ lang: "zh" }, { lang: "en" }];
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  return (
    <html
      lang={lang}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable}`}
    >
      <head>
        <script id="theme-init">{THEME_INIT_SCRIPT}</script>
      </head>
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
