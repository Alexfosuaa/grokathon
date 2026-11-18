"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  FORMATS,
  GRID_DAYS,
  GROUP_OPTIONS,
  TIME_LABELS,
  formatLabel,
  slotFor,
  type FormatId,
} from "@/lib/catalog"
import { buildPlan, hoursFor } from "@/lib/plan"
import { SAMPLE_COURSES, SAMPLE_NOTES } from "@/lib/sample"
import { SemesterPlan } from "@/components/semester-plan"
import { YaleMark } from "@/components/yale-mark"
import type { Course, ExamNote } from "@/lib/types"
import { DESIGNATIONS, GRADE_TARGETS, type Designation, type GradeTarget } from "@/lib/types"

type UserProfile = {
  email: string
  netid: string
  name: string
  year: string
  college: string
  major: string
  canvasUrl: string
  calendarUrl: string
  onboarded: boolean
}

type HuddleMessage = {
  id: string
  examGroup: string
  courseName: string
  content: string
  difficulty: number
  tips: string
  author: string
  season: string
  timestamp: number
  sample: boolean
}

type AppTab = "today" | "week" | "courses" | "grades" | "calendar" | "finals" | "huddle" | "settings"

const YALE_COLLEGES = [
  "Benjamin Franklin", "Berkeley", "Branford", "Davenport", "Ezra Stiles",
  "Grace Hopper", "Jonathan Edwards", "Morse", "Pauli Murray", "Pierson",
  "Saybrook", "Silliman", "Timothy Dwight", "Trumbull",
]

const PROFILE_KEY = "yscholar-profile-v1"
const COURSE_KEY = "yscholar-courses-v1"
const NOTE_KEY = "yscholar-notes-v1"
const HUDDLE_KEY = "yscholar-huddle-v1"

const NAV_ITEMS: { id: AppTab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "courses", label: "Courses" },
  { id: "grades", label: "Grades" },
  { id: "calendar", label: "Calendar" },
  { id: "finals", label: "Finals" },
  { id: "huddle", label: "Huddle" },
]

const emptyDraft = {
  name: "",
  instructor: "",
  group: "34",
  format: "blue-book" as FormatId,
  designation: "HU" as Designation,
  targetGrade: "A-" as GradeTarget,
}

const SAMPLE_HUDDLE: HuddleMessage[] = [
  {
    id: "h1", examGroup: "65", courseName: "PHYS 1800",
    content: "The final leaned heavily on the last 3 weeks. Rotational dynamics was at least 40%. Way harder than the practice final.",
    difficulty: 4, tips: "Redo the last 3 problem sets closed-book. The practice final gives false confidence.",
    author: "Anonymous Bulldog", season: "Fall 2025", timestamp: Date.now() - 86400000 * 365, sample: true,
  },
  {
    id: "h2", examGroup: "65", courseName: "PHYS 1800",
    content: "Formula sheet was allowed but barely helped. It is about understanding the setup, not plugging into formulas.",
    difficulty: 4, tips: "Practice setting up problems in words before calculating. That is where the points are.",
    author: "Anonymous Bulldog", season: "Fall 2024", timestamp: Date.now() - 86400000 * 730, sample: true,
  },
  {
    id: "h3", examGroup: "69", courseName: "MATH 1150",
    content: "Eight problems, all from worksheets but with slightly different numbers. Partial credit was generous.",
    difficulty: 3, tips: "Redo every worksheet problem you got wrong. The exam is literally those with different numbers.",
    author: "Anonymous Bulldog", season: "Fall 2025", timestamp: Date.now() - 86400000 * 365, sample: true,
  },
  {
    id: "h4", examGroup: "69", courseName: "MATH 1150",
    content: "More straightforward than I expected. If you can do the homework comfortably, you can do the final.",
    difficulty: 2, tips: "Do not overstudy. Focus on understanding concepts, not memorizing proofs.",
    author: "Anonymous Bulldog", season: "Fall 2024", timestamp: Date.now() - 86400000 * 730, sample: true,
  },
  {
    id: "h5", examGroup: "63", courseName: "Intro English",
    content: "Unseen passage close reading plus one question that could have been any paper prompt from the term.",
    difficulty: 3, tips: "Practice timed close readings. 50 minutes goes fast. The essay is what matters.",
    author: "Anonymous Bulldog", season: "Fall 2025", timestamp: Date.now() - 86400000 * 365, sample: true,
  },
  {
    id: "h6", examGroup: "34", courseName: "College Seminar",
    content: "Two essay prompts from the last 3 weeks of discussion plus an identification from section.",
    difficulty: 3, tips: "Write one-page argument summaries for each recent reading. A thesis beats a summary.",
    author: "Anonymous Bulldog", season: "Fall 2025", timestamp: Date.now() - 86400000 * 365, sample: true,
  },
  {
    id: "h7", examGroup: "61", courseName: "L5 Language",
    content: "Listening section was fast. Grammar focused on the last 3 weeks. The oral was the easiest part.",
    difficulty: 3, tips: "Drill recent grammar patterns. Say everything out loud at least once before the exam.",
    author: "Anonymous Bulldog", season: "Fall 2025", timestamp: Date.now() - 86400000 * 365, sample: true,
  },
]

function generateTips(courses: Course[]): string[] {
  const tips: string[] = []
  for (const course of courses) {
    const slot = slotFor(course.group)
    if (course.format === "problem-set")
      tips.push(`${course.name}: Redo missed problems before starting new material. Active recall beats re-reading notes.`)
    else if (course.format === "blue-book")
      tips.push(`${course.name}: Write argument outlines, not summaries. Blue books reward thesis-driven writing.`)
    else if (course.format === "essay")
      tips.push(`${course.name}: Practice one timed close reading today. Speed matters as much as insight.`)
    else if (course.format === "paper")
      tips.push(`${course.name}: Outline your paper this week. Group 0 papers need reading period for the final push.`)
    if (slot)
      tips.push(`${course.name}: Your exam is ${slot.shortDay} at ${slot.time}. Plan your study schedule backwards from that date.`)
  }
  tips.push("Study in the order exams appear on the grid. First exam gets the most reading period.")
  tips.push("90-minute focused blocks with breaks beat 4-hour marathons. Quality over quantity.")
  tips.push("Check the Huddle for insights from students who have taken your exams before.")
  return tips
}

export function YScholar() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [onboardStep, setOnboardStep] = useState(0)
  const [tab, setTab] = useState<AppTab>("today")
  const [courses, setCourses] = useState<Course[]>(SAMPLE_COURSES)
  const [notes, setNotes] = useState<ExamNote[]>(SAMPLE_NOTES)
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_COURSES[0].id)
  const [deanMoves, setDeanMoves] = useState(false)
  const [holyDay, setHolyDay] = useState(false)
  const [varsity, setVarsity] = useState(false)
  const [finalsTab, setFinalsTab] = useState<"grid" | "plan" | "dean">("grid")
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [formError, setFormError] = useState("")
  const [huddle, setHuddle] = useState<HuddleMessage[]>(SAMPLE_HUDDLE)
  const [huddleGroup, setHuddleGroup] = useState("")
  const [huddleDraft, setHuddleDraft] = useState({ content: "", tips: "", difficulty: "3" })
  const [aiTip, setAiTip] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [onboardDraft, setOnboardDraft] = useState({ name: "", year: "2028", college: "Branford", major: "" })
  const [loginEmail, setLoginEmail] = useState("")
  const [loginError, setLoginError] = useState("")
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I’m your Grok AI study assistant. Ask me anything about your courses, exams, or study strategy." },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)

  useEffect(() => {
    const stored = readJson<UserProfile>(PROFILE_KEY)
    if (stored?.onboarded) setProfile(stored)
    else if (stored) { setProfile(stored); setOnboardStep(1) }
    const c = readJson<Course[]>(COURSE_KEY)
    if (c && c.length > 0 && c.every(isValidCourse)) setCourses(c)
    const n = readJson<ExamNote[]>(NOTE_KEY)
    if (n) setNotes([...SAMPLE_NOTES, ...n.filter((x) => !x.sample)])
    const h = readJson<HuddleMessage[]>(HUDDLE_KEY)
    if (h) setHuddle([...SAMPLE_HUDDLE, ...h.filter((x) => !x.sample)])
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(COURSE_KEY, JSON.stringify(courses))
    localStorage.setItem(NOTE_KEY, JSON.stringify(notes.filter((n) => !n.sample)))
    localStorage.setItem(HUDDLE_KEY, JSON.stringify(huddle.filter((m) => !m.sample)))
  }, [courses, notes, huddle, ready])

  useEffect(() => {
    if (!profile?.onboarded || courses.length === 0) return
    const tips = generateTips(courses)
    let idx = 0
    const show = () => {
      setAiTip(tips[idx % tips.length])
      idx++
      setTimeout(() => setAiTip(null), 5000)
    }
    const t1 = setTimeout(show, 4000)
    const interval = setInterval(show, 40000)
    return () => { clearTimeout(t1); clearInterval(interval) }
  }, [profile?.onboarded, courses])

  const selected = courses.find((c) => c.id === selectedId) ?? courses[0] ?? null
  const plan = useMemo(
    () => buildPlan(courses, notes, { deanMoves, holyDay, varsity, conflictId: selected?.id ?? null }),
    [courses, notes, deanMoves, holyDay, varsity, selected?.id],
  )

  const enrolledGroups = new Set(courses.map((c) => c.group))
  const visibleHuddle = huddle.filter((m) => enrolledGroups.has(m.examGroup))

  function signIn() {
    const email = loginEmail.trim().toLowerCase()
    if (!/^[a-z0-9][a-z0-9._-]{0,62}@yale\.edu$/.test(email)) {
      setLoginError("Use your @yale.edu address.")
      return
    }
    const p: UserProfile = { email, netid: email.split("@")[0], name: "", year: "2028", college: "", major: "", canvasUrl: "", calendarUrl: "", onboarded: false }
    setProfile(p)
    setOnboardStep(1)
  }

  function completeOnboarding() {
    if (!profile) return
    const updated: UserProfile = { ...profile, name: onboardDraft.name.trim(), year: onboardDraft.year, college: onboardDraft.college, major: onboardDraft.major.trim(), onboarded: true }
    setProfile(updated)
    localStorage.setItem(PROFILE_KEY, JSON.stringify(updated))
  }

  function addCourse() {
    const name = draft.name.trim()
    if (!name) { setFormError("Name the course."); return }
    const course: Course = { id: crypto.randomUUID(), name, instructor: draft.instructor.trim(), group: draft.group, format: draft.format, designation: draft.designation, targetGrade: draft.targetGrade, note: "" }
    setCourses((c) => [...c, course])
    setSelectedId(course.id)
    setDraft(emptyDraft)
    setFormError("")
    setAdding(false)
  }

  function buildContext() {
    return courses.map((c) => {
      const slot = slotFor(c.group)
      return `${c.name} (target: ${c.targetGrade ?? "B+"}, exam: ${slot ? `${slot.day} ${slot.time}` : c.group === "0" ? "term essay, no exam slot" : "time arranged"}, format: ${formatLabel(c.format)})`
    }).join("; ")
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text || chatLoading) return
    const userMsg = { role: "user" as const, content: text }
    const all = [...chatMessages, userMsg]
    setChatMessages(all)
    setChatInput("")
    setChatLoading(true)
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: all.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content })),
          context: buildContext(),
        }),
      })
      if (!res.ok || !res.body) {
        const err = await res.text().catch(() => "Unknown error")
        setChatMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err}` }])
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let reply = ""
      setChatMessages((prev) => [...prev, { role: "assistant", content: "" }])
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split("\n")) {
          const trimmed = line.trim()
          if (trimmed.startsWith("data: ") && trimmed !== "data: [DONE]") {
            try {
              const data = JSON.parse(trimmed.slice(6))
              const delta = data.choices?.[0]?.delta?.content
              if (delta) {
                reply += delta
                const r = reply
                setChatMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: "assistant", content: r }; return u })
              }
            } catch {}
          }
        }
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", content: "Could not reach Grok AI. Check your API key." }])
    } finally {
      setChatLoading(false)
    }
  }

  if (!ready) return <div className="min-h-screen bg-white" />

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00356B] via-[#002147] to-[#001a3a] text-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-5xl font-black tracking-tight font-heading flex items-center -space-x-0.5">
            <YaleMark className="h-14 w-14" />
            <span>Scholar</span>
          </h1>
          <p className="mt-3 text-lg text-[#A7C4E5]">Your AI-powered study companion at Yale</p>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-[#A7C4E5]/80">
            <span>AI Study Planner</span>
            <span>Exam Huddle</span>
            <span>Grade Tracker</span>
            <span>Finals Grid</span>
          </div>
          <form className="mt-10 w-full max-w-xs flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); signIn() }}>
            <Input className="bg-white/10 border-white/20 text-white placeholder:text-white/40" type="email" autoComplete="username" placeholder="netid@yale.edu" value={loginEmail} onChange={(e) => { setLoginEmail(e.target.value); setLoginError("") }} />
            {loginError && <p className="text-sm text-red-300">{loginError}</p>}
            <Button type="submit" className="bg-white text-[#00356B] hover:bg-[#e7f0fa]">Sign in with Yale</Button>
          </form>
        </div>
        <footer className="p-4 text-center text-xs text-[#A7C4E5]/40">Yale College &middot; Fall 2026 &middot; Powered by Grok AI</footer>
      </div>
    )
  }

  if (!profile.onboarded) {
    return (
      <div className="min-h-screen bg-white text-[#00356B] flex flex-col">
        <header className="bg-[#00356B] text-white px-4 py-3">
          <div className="flex items-center -space-x-0.5 max-w-md mx-auto">
            <YaleMark className="h-7 w-7" />
            <span className="text-lg font-black font-heading">Scholar</span>
          </div>
        </header>
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <div className="flex gap-2 mb-6">
              {[1, 2].map((s) => (
                <div key={s} className={`h-1 flex-1 rounded ${s <= onboardStep ? "bg-[#00356B]" : "bg-[#c5d7ea]"}`} />
              ))}
            </div>
            {onboardStep === 1 && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[#286dc0] uppercase">Step 1 of 2</p>
                  <h1 className="mt-1 text-2xl font-semibold">Welcome, {profile.netid}</h1>
                  <p className="mt-1 text-sm text-[#4d6d8c]">Tell us about yourself so Grok AI can personalize your experience.</p>
                </div>
                <Field label="Full name">
                  <Input value={onboardDraft.name} onChange={(e) => setOnboardDraft({ ...onboardDraft, name: e.target.value })} placeholder="Your name" />
                </Field>
                <Field label="Class year">
                  <Select value={onboardDraft.year} onValueChange={(v) => { if (v) setOnboardDraft({ ...onboardDraft, year: v }) }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["2027", "2028", "2029", "2030"].map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Residential college">
                  <Select value={onboardDraft.college} onValueChange={(v) => { if (v) setOnboardDraft({ ...onboardDraft, college: v }) }}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {YALE_COLLEGES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Major or concentration">
                  <Input value={onboardDraft.major} onChange={(e) => setOnboardDraft({ ...onboardDraft, major: e.target.value })} placeholder="Computer Science, English, Economics..." />
                </Field>
                <Button onClick={() => setOnboardStep(2)} className="bg-[#00356B] text-white">Continue</Button>
              </div>
            )}
            {onboardStep === 2 && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-medium tracking-wide text-[#286dc0] uppercase">Step 2 of 2</p>
                  <h1 className="mt-1 text-2xl font-semibold">Your courses</h1>
                  <p className="mt-1 text-sm text-[#4d6d8c]">Load sample courses to explore, or start empty and add your own.</p>
                </div>
                <div className="border border-[#c5d7ea] p-4">
                  <p className="font-medium">Sample course load</p>
                  <p className="text-sm text-[#4d6d8c] mt-1">4 courses across sciences, humanities, and languages.</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {SAMPLE_COURSES.map((c) => <Badge key={c.id} variant="secondary">{c.name}</Badge>)}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => { setCourses(SAMPLE_COURSES); completeOnboarding() }} className="flex-1 bg-[#00356B] text-white">Load sample &amp; start</Button>
                  <Button variant="outline" onClick={() => { setCourses([]); completeOnboarding() }} className="flex-1">Start empty</Button>
                </div>
                <button type="button" className="text-sm text-[#286dc0] underline" onClick={() => setOnboardStep(1)}>Back</button>
              </div>
            )}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-[#00356B] flex flex-col">
      <header className="bg-[#00356B] text-white shrink-0 sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-baseline -space-x-0.5">
            <YaleMark className="h-7 w-7 self-center" />
            <div>
              <p className="text-lg font-black leading-none font-heading">Scholar</p>
              <p className="text-[11px] text-[#A7C4E5]">Yale College &middot; Fall 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm text-[#A7C4E5]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
              </span>
              Grok AI
            </div>
            <button type="button" className="text-sm text-[#A7C4E5] hover:text-white" onClick={() => setTab("settings")}>
              {profile.name || profile.netid}
            </button>
            <button type="button" className="text-xs text-[#A7C4E5]/60 hover:text-white" onClick={() => {
              localStorage.removeItem(PROFILE_KEY)
              localStorage.removeItem(COURSE_KEY)
              localStorage.removeItem(NOTE_KEY)
              localStorage.removeItem(HUDDLE_KEY)
              setProfile(null)
            }}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {aiTip && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-[#00356B] text-white px-4 py-3 rounded-lg shadow-xl z-50 border border-[#286dc0]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
            <p className="text-xs text-[#A7C4E5] font-medium">Grok AI</p>
          </div>
          <p className="text-sm">{aiTip}</p>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <nav className="w-48 shrink-0 border-r border-[#c5d7ea] bg-[#f4f8fc] hidden md:flex flex-col">
          <div className="flex flex-col py-3 flex-1">
            {NAV_ITEMS.map((item) => (
              <button key={item.id} type="button" className={`px-4 py-2.5 text-left text-sm transition-colors ${tab === item.id ? "border-l-2 border-[#00356B] bg-white font-semibold text-[#00356B]" : "border-l-2 border-transparent text-[#4d6d8c] hover:bg-white/60 hover:text-[#00356B]"}`} onClick={() => setTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="border-t border-[#c5d7ea] py-3">
            <button type="button" className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${tab === "settings" ? "border-l-2 border-[#00356B] bg-white font-semibold text-[#00356B]" : "border-l-2 border-transparent text-[#4d6d8c] hover:bg-white/60 hover:text-[#00356B]"}`} onClick={() => setTab("settings")}>
              Settings
            </button>
          </div>
        </nav>

        <div className="flex flex-1 flex-col md:hidden border-b border-[#c5d7ea] bg-[#f4f8fc] shrink-0">
          <div className="flex overflow-x-auto px-2 py-1 gap-1">
            {[...NAV_ITEMS, { id: "settings" as AppTab, label: "Settings" }].map((item) => (
              <button key={item.id} type="button" className={`shrink-0 px-3 py-1.5 text-xs ${tab === item.id ? "bg-white font-semibold text-[#00356B]" : "text-[#4d6d8c]"}`} onClick={() => setTab(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">

            {tab === "today" && (
              <div className="flex flex-col gap-4">
                <h1 className="font-heading text-2xl">Good {timeOfDay()}, {profile.name?.split(" ")[0] || profile.netid}</h1>
                <p className="text-sm text-[#4d6d8c] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  Study plan generated by Grok AI
                </p>
                <SemesterPlan courses={courses} setCourses={setCourses} section="today" onOpenCourse={(id) => { setSelectedId(id); setTab("grades") }} />
              </div>
            )}

            {tab === "week" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-[#4d6d8c] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  Weekly plan powered by Grok AI &middot; Adjusts based on your logged activity
                </p>
                <SemesterPlan courses={courses} setCourses={setCourses} section="week" />
              </div>
            )}

            {tab === "courses" && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-heading text-2xl">Courses</h2>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { setAdding(true); setFormError("") }}>Add a course</Button>
                    <Button variant="outline" size="sm" onClick={() => { setCourses(SAMPLE_COURSES); setNotes(SAMPLE_NOTES); setSelectedId(SAMPLE_COURSES[0].id) }}>Load sample</Button>
                  </div>
                </div>
                <ul className="flex flex-col gap-2">
                  {courses.map((course) => {
                    const slot = slotFor(course.group)
                    const active = course.id === selected?.id
                    return (
                      <li key={course.id}>
                        <button type="button" onClick={() => setSelectedId(course.id)} className={`w-full border px-4 py-3 text-left transition-colors ${active ? "border-[#00356B] bg-[#00356B] text-white" : "border-[#c5d7ea] bg-white hover:border-[#286dc0]"}`}>
                          <span className="flex items-start justify-between gap-3">
                            <span>
                              <span className="block font-medium">{course.designation ? `${course.designation} · ` : ""}{course.name}</span>
                              <span className={`mt-1 block text-xs ${active ? "text-white/70" : "text-[#4d6d8c]"}`}>
                                {slot ? `Group ${course.group} · ${slot.shortDay} · ${slot.time}` : course.group === "0" ? "Group 0 · term essay" : "Group 50 · time arranged"}
                                {` · ${formatLabel(course.format)} · ${hoursFor(course, notes)}h est.`}
                              </span>
                            </span>
                            <Badge variant={active ? "secondary" : "outline"} className={active ? "text-[#00356B]" : ""}>{course.targetGrade ?? "—"}</Badge>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                  {courses.length === 0 && (
                    <li className="border border-dashed border-[#c5d7ea] px-4 py-8 text-center text-sm text-[#4d6d8c]">No courses yet. Add yours or load the sample load.</li>
                  )}
                </ul>
                {selected && (
                  <div className="border border-[#c5d7ea] bg-white p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-heading text-xl">{selected.designation ? `${selected.designation} · ` : ""}{selected.name}</h3>
                        <p className="text-xs text-[#4d6d8c]">
                          {(() => { const s = slotFor(selected.group); return s ? `Group ${selected.group} · ${s.day}, ${s.time}` : selected.group === "0" ? "Group 0 · term essay" : "Group 50 · time arranged" })()}
                          {` · ${formatLabel(selected.format)}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Select value={selected.targetGrade ?? "B+"} onValueChange={(v) => { if (v) setCourses((c) => c.map((x) => x.id === selected.id ? { ...x, targetGrade: v as GradeTarget } : x)) }}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>{GRADE_TARGETS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" onClick={() => setCourses((c) => c.filter((x) => x.id !== selected.id))}>Remove</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-[#4d6d8c]">Estimated study hours</p><p className="font-medium">{hoursFor(selected, notes)}h</p></div>
                      <div><p className="text-[#4d6d8c]">Target grade</p><p className="font-medium">{selected.targetGrade ?? "Not set"}</p></div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <Button variant="outline" size="sm" onClick={() => setTab("grades")}>Grade breakdown</Button>
                      <Button variant="outline" size="sm" onClick={() => { setHuddleGroup(selected.group); setTab("huddle") }}>Exam feedback</Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {tab === "grades" && <SemesterPlan courses={courses} setCourses={setCourses} section="grades" />}
            {tab === "calendar" && <SemesterPlan courses={courses} setCourses={setCourses} section="calendar" />}

            {tab === "finals" && (
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 border-b border-[#c5d7ea] mb-2">
                  {(["grid", "plan", "dean"] as const).map((id) => (
                    <button key={id} type="button" className={`px-3 py-2 text-sm ${finalsTab === id ? "border-b-2 border-[#00356B] font-medium" : "text-[#4d6d8c]"}`} onClick={() => setFinalsTab(id)}>
                      {id === "dean" ? "College Dean" : id === "grid" ? "Exam Grid" : "Study Plan"}
                    </button>
                  ))}
                </div>
                {finalsTab === "grid" && <ExamGrid courses={courses} moveId={deanMoves ? plan.move?.id ?? null : null} onSelect={(id) => { setSelectedId(id); setTab("courses") }} selectedId={selected?.id ?? null} />}
                {finalsTab === "plan" && (
                  <section className="flex flex-col gap-4">
                    <p className="text-sm text-[#4d6d8c] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      Finals study plan generated by Grok AI
                    </p>
                    <p className="text-lg font-semibold">{plan.headline}</p>
                    <p className="text-sm text-[#4d6d8c]">{plan.detail}</p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">{plan.wantedHours}h wanted</Badge>
                      <Badge variant="outline">{plan.heldHours}h open</Badge>
                    </div>
                    <ol className="flex flex-col">
                      {plan.blocks.map((block) => (
                        <li key={block.id} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-[#c5d7ea] py-3">
                          <div>
                            <p className="text-xs text-[#286dc0] uppercase">{block.kicker}</p>
                            <p className="text-sm font-medium">{block.when}</p>
                          </div>
                          <div>{block.lines.map((line) => <p key={line} className="text-sm">{line}</p>)}</div>
                        </li>
                      ))}
                    </ol>
                    {plan.uncovered.length > 0 && (
                      <div className="border-t border-[#c5d7ea] pt-3">
                        <p className="text-sm font-medium mb-2">Still uncovered</p>
                        {plan.uncovered.map((u) => <p key={u} className="text-sm text-[#4d6d8c] mb-1">{u}</p>)}
                      </div>
                    )}
                  </section>
                )}
                {finalsTab === "dean" && (
                  <section className="flex max-w-xl flex-col gap-3">
                    <p className="text-lg font-semibold">{plan.move ? `Ask about ${plan.move.name}` : "No postponement on this load"}</p>
                    <ul className="list-disc pl-4 text-sm text-[#4d6d8c]">
                      <li>3 exams on Dec 15–16</li>
                      <li>3 back to back, or 3 in any 4 slots</li>
                      <li>Holy day or varsity</li>
                      <li>Your college dean decides. Travel does not count.</li>
                    </ul>
                    {plan.rules.qualifies && plan.move && (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={deanMoves} onChange={(e) => setDeanMoves(e.target.checked)} />
                        Plan as if your college dean postpones {plan.move.name}
                      </label>
                    )}
                    <div className="flex flex-col gap-2 text-sm">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={holyDay} onChange={(e) => setHolyDay(e.target.checked)} /> Religious holy day</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={varsity} onChange={(e) => setVarsity(e.target.checked)} /> Intercollegiate varsity</label>
                    </div>
                    {plan.email && <p className="text-sm leading-relaxed border border-[#c5d7ea] p-3 bg-[#f4f8fc]">{plan.email}</p>}
                  </section>
                )}
              </div>
            )}

            {tab === "huddle" && (
              <section className="flex flex-col gap-4">
                <div>
                  <h2 className="font-heading text-2xl">Exam Huddle</h2>
                  <p className="text-sm text-[#4d6d8c] mt-1">Anonymous exam feedback from Yale students. You see only courses you are taking.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={huddleGroup === "" ? "default" : "outline"} onClick={() => setHuddleGroup("")}>All</Button>
                  {uniqueByGroup(courses.filter((c) => c.group !== "0")).map((c) => (
                    <Button key={c.id} size="sm" variant={huddleGroup === c.group ? "default" : "outline"} onClick={() => setHuddleGroup(c.group)}>{c.name}</Button>
                  ))}
                </div>
                <div className="bg-[#e7f0fa] border border-[#c5d7ea] px-4 py-3 text-sm">
                  Just finished an exam? Share your experience to help future Yale students.
                </div>
                <ul className="flex flex-col gap-3">
                  {(huddleGroup ? visibleHuddle.filter((m) => m.examGroup === huddleGroup) : visibleHuddle).map((msg) => (
                    <li key={msg.id} className="border border-[#c5d7ea] bg-white p-4">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{msg.courseName}</Badge>
                          {msg.sample && <span className="text-xs text-[#4d6d8c]">Sample</span>}
                        </div>
                        <span className="text-xs text-[#4d6d8c]">{msg.season}</span>
                      </div>
                      <div className="flex gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={`text-sm ${s <= msg.difficulty ? "text-[#286dc0]" : "text-[#c5d7ea]"}`}>{"●"}</span>
                        ))}
                        <span className="text-xs text-[#4d6d8c] ml-1">difficulty</span>
                      </div>
                      <p className="text-sm mb-2">{msg.content}</p>
                      {msg.tips && <p className="text-sm text-[#286dc0] bg-[#e7f0fa] px-3 py-2">Tip: {msg.tips}</p>}
                    </li>
                  ))}
                  {visibleHuddle.length === 0 && (
                    <li className="text-sm text-[#4d6d8c] py-8 text-center">No feedback yet for your courses.</li>
                  )}
                </ul>
                <div className="border border-[#c5d7ea] bg-white p-4 flex flex-col gap-3">
                  <h3 className="font-medium">Share your experience</h3>
                  <Field label="Course">
                    <Select value={huddleGroup || courses[0]?.group || ""} onValueChange={(v) => { if (v) setHuddleGroup(v) }}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {uniqueByGroup(courses.filter((c) => c.group !== "0")).map((c) => <SelectItem key={c.group} value={c.group}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="What showed up on the exam?">
                    <Textarea value={huddleDraft.content} onChange={(e) => setHuddleDraft({ ...huddleDraft, content: e.target.value })} rows={2} maxLength={500} />
                  </Field>
                  <Field label="Tips for future students">
                    <Textarea value={huddleDraft.tips} onChange={(e) => setHuddleDraft({ ...huddleDraft, tips: e.target.value })} rows={2} maxLength={300} />
                  </Field>
                  <Field label="Difficulty (1 easy – 5 hard)">
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((d) => (
                        <button key={d} type="button" className={`h-8 w-8 rounded border text-sm ${Number(huddleDraft.difficulty) === d ? "bg-[#00356B] text-white border-[#00356B]" : "border-[#c5d7ea]"}`} onClick={() => setHuddleDraft({ ...huddleDraft, difficulty: String(d) })}>
                          {d}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Button onClick={() => {
                    const group = huddleGroup || courses[0]?.group
                    if (!huddleDraft.content.trim() || !group) return
                    const course = courses.find((c) => c.group === group)
                    setHuddle((h) => [{ id: crypto.randomUUID(), examGroup: group, courseName: course?.name ?? "Unknown", content: huddleDraft.content.trim(), tips: huddleDraft.tips.trim(), difficulty: Number(huddleDraft.difficulty), author: "You", season: "Fall 2026", timestamp: Date.now(), sample: false }, ...h])
                    setHuddleDraft({ content: "", tips: "", difficulty: "3" })
                  }}>
                    Post anonymously
                  </Button>
                </div>
              </section>
            )}

            {tab === "settings" && (
              <section className="flex flex-col gap-6 max-w-lg">
                <h2 className="font-heading text-2xl">Settings</h2>
                <div className="border border-[#c5d7ea] bg-white p-4 flex flex-col gap-4">
                  <h3 className="font-medium">Profile</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-[#4d6d8c]">Name</p><p className="font-medium">{profile.name || "—"}</p></div>
                    <div><p className="text-[#4d6d8c]">NetID</p><p className="font-medium">{profile.netid}</p></div>
                    <div><p className="text-[#4d6d8c]">Class</p><p className="font-medium">{profile.year}</p></div>
                    <div><p className="text-[#4d6d8c]">College</p><p className="font-medium">{profile.college || "—"}</p></div>
                    <div className="col-span-2"><p className="text-[#4d6d8c]">Major</p><p className="font-medium">{profile.major || "—"}</p></div>
                  </div>
                </div>
                <div className="border border-[#c5d7ea] bg-white p-4 flex flex-col gap-3">
                  <h3 className="font-medium">Integrations</h3>
                  <p className="text-sm text-[#4d6d8c]">Connect your tools for a smarter study experience.</p>
                  <Field label="Canvas calendar URL">
                    <Input value={profile.canvasUrl} onChange={(e) => { const u = { ...profile, canvasUrl: e.target.value }; setProfile(u); localStorage.setItem(PROFILE_KEY, JSON.stringify(u)) }} placeholder="https://canvas.yale.edu/feeds/calendars/..." />
                  </Field>
                  <Field label="Google Calendar URL">
                    <Input value={profile.calendarUrl} onChange={(e) => { const u = { ...profile, calendarUrl: e.target.value }; setProfile(u); localStorage.setItem(PROFILE_KEY, JSON.stringify(u)) }} placeholder="https://calendar.google.com/calendar/ical/..." />
                  </Field>
                  <p className="text-xs text-[#4d6d8c]">Paste your calendar feeds here. Use the Calendar tab to import events.</p>
                </div>
                <div className="border border-[#c5d7ea] bg-white p-4 flex flex-col gap-3">
                  <h3 className="font-medium">AI Assistant</h3>
                  <p className="text-sm text-[#4d6d8c]">Grok AI runs in the background to generate study plans and suggestions based on your courses, grades, and exam schedule.</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                    </span>
                    Grok AI is active
                  </div>
                </div>
                <div className="border border-[#c5d7ea] bg-white p-4 flex flex-col gap-3">
                  <h3 className="font-medium">Data</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCourses(SAMPLE_COURSES); setNotes(SAMPLE_NOTES); setHuddle(SAMPLE_HUDDLE) }}>Reset to sample data</Button>
                    <Button variant="outline" size="sm" onClick={() => { setCourses([]); setNotes(SAMPLE_NOTES); setSelectedId("") }}>Clear courses</Button>
                  </div>
                </div>
                <Button variant="outline" className="text-destructive border-destructive/30" onClick={() => {
                  localStorage.removeItem(PROFILE_KEY)
                  localStorage.removeItem(COURSE_KEY)
                  localStorage.removeItem(NOTE_KEY)
                  localStorage.removeItem(HUDDLE_KEY)
                  setProfile(null)
                }}>
                  Sign out and clear data
                </Button>
              </section>
            )}
          </div>
        </main>
      </div>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a course</DialogTitle>
            <DialogDescription>Exam group from Yale Course Search.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Course">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="PHYS 1800" />
            </Field>
            <Field label="Instructor">
              <Input value={draft.instructor} onChange={(e) => setDraft({ ...draft, instructor: e.target.value })} placeholder="From the syllabus" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Designation">
                <Select value={draft.designation} onValueChange={(v) => { if (v) setDraft({ ...draft, designation: v as Designation }) }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Target grade">
                <Select value={draft.targetGrade} onValueChange={(v) => { if (v) setDraft({ ...draft, targetGrade: v as GradeTarget }) }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{GRADE_TARGETS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Exam group">
              <Select value={draft.group} onValueChange={(v) => { if (v) setDraft({ ...draft, group: v }) }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{GROUP_OPTIONS.map((o) => <SelectItem key={o.group} value={o.group}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Exam format">
              <Select value={draft.format} onValueChange={(v) => { if (v) setDraft({ ...draft, format: v as FormatId }) }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>{FORMATS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={addCourse}>Add to my courses</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {profile.onboarded && (
        <>
          {!chatOpen && (
            <button type="button" onClick={() => setChatOpen(true)} className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[#00356B] text-white shadow-lg flex items-center justify-center hover:bg-[#286dc0] transition-colors">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            </button>
          )}
          {chatOpen && (
            <div className="fixed bottom-5 right-5 z-50 w-[22rem] rounded-lg border border-[#c5d7ea] bg-white shadow-2xl flex flex-col" style={{ height: "28rem" }}>
              <div className="flex items-center justify-between bg-[#00356B] text-white px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" /></span>
                  <span className="text-sm font-semibold">Grok AI Assistant</span>
                </div>
                <button type="button" onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2.5 text-sm">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={msg.role === "user" ? "self-end bg-[#00356B] text-white px-3 py-2 rounded-lg rounded-br-none max-w-[85%]" : "self-start bg-[#e7f0fa] text-[#00356B] px-3 py-2 rounded-lg rounded-bl-none max-w-[85%]"}>
                    {msg.content || (chatLoading ? "…" : "")}
                  </div>
                ))}
              </div>
              <form className="border-t border-[#c5d7ea] px-3 py-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); sendChat() }}>
                <input className="flex-1 text-sm border border-[#c5d7ea] rounded px-2.5 py-1.5 outline-none focus:border-[#286dc0] text-[#00356B]" placeholder="Ask about your courses..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} disabled={chatLoading} />
                <button type="submit" disabled={chatLoading} className="bg-[#00356B] text-white px-3 py-1.5 rounded text-sm hover:bg-[#286dc0] disabled:opacity-50">Send</button>
              </form>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ExamGrid({ courses, selectedId, moveId, onSelect }: { courses: Course[]; selectedId: string | null; moveId: string | null; onSelect: (id: string) => void }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl">The grid</h2>
      <div className="flex flex-col gap-4 md:hidden">
        {GRID_DAYS.slice(0, 4).map((day) => <DayStack key={day.short} day={day} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />)}
        <p className="border border-dashed border-foreground/20 px-3 py-3 text-sm text-muted-foreground">Saturday and Sunday, December 19–20. No final examinations on the weekend.</p>
        {GRID_DAYS.slice(4).map((day) => <DayStack key={day.short} day={day} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />)}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-[5.5rem_repeat(4,1fr)_8rem_repeat(2,1fr)] gap-1">
            <div />
            {GRID_DAYS.slice(0, 4).map((day) => <div key={day.short} className="px-1 text-xs font-medium tracking-wide uppercase">{day.short}</div>)}
            <div className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Dec 19–20</div>
            {GRID_DAYS.slice(4).map((day) => <div key={day.short} className="px-1 text-xs font-medium tracking-wide uppercase">{day.short}</div>)}
            {TIME_LABELS.map((time, timeIndex) => <GridRow key={time} time={time} timeIndex={timeIndex} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

function GridRow({ time, timeIndex, courses, selectedId, moveId, onSelect }: { time: string; timeIndex: number; courses: Course[]; selectedId: string | null; moveId: string | null; onSelect: (id: string) => void }) {
  const cells = [...GRID_DAYS.slice(0, 4).map((day) => day.times[timeIndex]), "weekend" as const, ...GRID_DAYS.slice(4).map((day) => day.times[timeIndex])]
  return (
    <>
      <div className="py-2 text-xs text-muted-foreground">{time}</div>
      {cells.map((group, index) => {
        if (group === "weekend") return <div key={`${time}-weekend`} className="border border-dashed border-foreground/15 bg-muted/60 px-2 py-2 text-xs leading-snug text-muted-foreground">{timeIndex === 1 ? "No final examinations." : ""}</div>
        const caption = group === "makeup" ? "Makeup only" : group ? null : "No exam"
        const matches = group && group !== "makeup" ? courses.filter((c) => c.group === group) : []
        return (
          <div key={`${time}-${index}`} className="min-h-16 border border-foreground/10 bg-card p-1.5">
            {caption && <span className="text-xs text-muted-foreground/60">{caption}</span>}
            {matches.map((course) => (
              <button key={course.id} type="button" onClick={() => onSelect(course.id)} className={`mb-1 block w-full px-1.5 py-1 text-left text-xs leading-snug ${course.id === selectedId ? "bg-primary text-primary-foreground" : course.id === moveId ? "bg-destructive/15 text-destructive" : "bg-primary/10"}`}>
                {course.name}
              </button>
            ))}
          </div>
        )
      })}
    </>
  )
}

function DayStack({ day, courses, selectedId, moveId, onSelect }: { day: { short: string; times: (string | null)[] }; courses: Course[]; selectedId: string | null; moveId: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="border border-foreground/15 bg-card">
      <p className="border-b border-foreground/10 px-3 py-2 text-xs font-medium tracking-wide uppercase">{day.short}</p>
      {day.times.map((group, index) => {
        const caption = group === "makeup" ? "Makeup only" : group ? null : "No exam"
        const matches = group && group !== "makeup" ? courses.filter((c) => c.group === group) : []
        return (
          <div key={TIME_LABELS[index]} className="flex items-start gap-3 border-t border-foreground/10 px-3 py-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{TIME_LABELS[index]}</span>
            <div className="flex flex-1 flex-col gap-1">
              {caption && <span className="text-xs text-muted-foreground/60">{caption}</span>}
              {!caption && matches.length === 0 && <span className="text-xs text-muted-foreground/60">Open</span>}
              {matches.map((course) => (
                <button key={course.id} type="button" onClick={() => onSelect(course.id)} className={`px-2 py-1 text-left text-sm ${course.id === selectedId ? "bg-primary text-primary-foreground" : course.id === moveId ? "bg-destructive/15 text-destructive" : "bg-primary/10"}`}>
                  {course.name}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</div>
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch { return null }
}

function isValidCourse(value: unknown): value is Course {
  const v = value as Course
  return Boolean(v && typeof v.id === "string" && typeof v.name === "string" && typeof v.group === "string")
}

function uniqueByGroup(courses: Course[]): Course[] {
  const seen = new Set<string>()
  return courses.filter((c) => { if (seen.has(c.group)) return false; seen.add(c.group); return true })
}

function timeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}
