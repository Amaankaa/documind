import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DocuMind — AI Knowledge Base",
  description: "Ask your documents anything. Powered by RAG.",
};

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in";
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up";

const signInFallbackRedirectUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ??
  "/dashboard";

const signUpFallbackRedirectUrl =
  process.env.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL ??
  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL ??
  "/onboarding";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`h-full antialiased ${inter.variable} ${archivo.variable}`}
    >
      <body className="relative flex min-h-full flex-col overflow-x-hidden bg-canvas font-sans text-ink selection:bg-sun selection:text-ink">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ClerkProvider
            signInUrl={signInUrl}
            signUpUrl={signUpUrl}
            signInFallbackRedirectUrl={signInFallbackRedirectUrl}
            signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
          >
            <ReactQueryProvider>
              {children}
            </ReactQueryProvider>
            <Toaster richColors position="top-right" />
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
