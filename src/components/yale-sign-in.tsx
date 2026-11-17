"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { YaleMark } from "@/components/yale-mark"

const YALE_EMAIL = /^[a-z0-9][a-z0-9._-]{0,62}@yale\.edu$/

export function YaleSignIn({ onSignIn }: { onSignIn: (session: { email: string; netid: string }) => void }) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  function submit() {
    const value = email.trim().toLowerCase()
    if (!YALE_EMAIL.test(value)) {
      setError("Use your @yale.edu address.")
      return
    }
    onSignIn({ email: value, netid: value.split("@")[0] })
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#00356B]">
      <header className="bg-[#00356B] px-4 py-4 text-white">
        <div className="mx-auto flex max-w-sm items-center gap-3">
          <YaleMark />
          <div>
            <p className="text-lg font-semibold leading-none">YLearn</p>
            <p className="mt-1 text-xs text-[#A7C4E5]">Yale College</p>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#286dc0] uppercase">Step 1</p>
          <h1 className="mt-1 text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-[#4d6d8c]">Yale students only. Your NetID stays on this device.</p>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          <Label htmlFor="yale-email">Yale email</Label>
          <Input
            id="yale-email"
            type="email"
            autoComplete="username"
            placeholder="netid@yale.edu"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError("")
            }}
          />
          {error && <p className="text-sm text-[#9e2b25]">{error}</p>}
          <Button type="submit" className="bg-[#00356B] text-white hover:bg-[#286dc0]">
            Continue
          </Button>
        </form>
      </main>
    </div>
  )
}
