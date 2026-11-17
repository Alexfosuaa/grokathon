import type { Metadata } from "next"
import { Fraunces, Source_Sans_3 } from "next/font/google"
import "./globals.css"

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source",
})

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
})

export const metadata: Metadata = {
  title: "Reading Period",
  description: "A Yale College exam plan: your courses on the Fall 2026 grid, the dean postponement rules, and how to spend reading period.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${heading.variable} antialiased`}>{children}</body>
    </html>
  )
}
