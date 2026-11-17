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
  title: "YLearn",
  description: "Yale College, Fall 2026. What you still need on each exam, and where those exams sit.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${heading.variable} antialiased`}>{children}</body>
    </html>
  )
}
