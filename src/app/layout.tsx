import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import AuthButtons from "@/components/AuthButtons"; // ⬅️ add

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cybersecurity Directory",
  description: "Reviews, tools, courses & career paths for cybersecurity pros.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}>
        <header className="border-b">
          <nav className="mx-auto flex max-w-5xl items-center justify-between p-4">
            <Link href="/" className="text-base font-semibold">
              Cybersecurity Directory
            </Link>

            <div className="flex items-center gap-4 text-sm">
              <Link href="/resources" className="hover:underline">
                Resources
              </Link>
              <a
                href="https://github.com/Endworld23/cyberdirectory"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                GitHub
              </a>

              {/* ⬇️ Sign in / Sign out buttons */}
              <AuthButtons />
            </div>
          </nav>
        </header>

        <main className="mx-auto max-w-5xl p-6">{children}</main>

        <footer className="mt-10 border-t">
          <div className="mx-auto max-w-5xl p-4 text-xs text-gray-500">
            © {new Date().getFullYear()} Cybersecurity Directory — affiliate links may earn a commission.
          </div>
        </footer>
      </body>
    </html>
  );
}
