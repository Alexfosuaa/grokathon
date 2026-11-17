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
import { buildPlan, hoursFor, noteFor } from "@/lib/plan"
import { SAMPLE_COURSES, SAMPLE_NOTES } from "@/lib/sample"
import type { Course, ExamNote } from "@/lib/types"

const COURSE_KEY = "reading-period-courses-v1"
const NOTE_KEY = "reading-period-notes-v1"

const emptyDraft = {
  name: "",
  instructor: "",
  group: "34",
  format: "blue-book" as FormatId,
  note: "",
}

export function ReadingPeriod() {
  const [courses, setCourses] = useState<Course[]>(SAMPLE_COURSES)
  const [notes, setNotes] = useState<ExamNote[]>(SAMPLE_NOTES)
  const [ready, setReady] = useState(false)
  const [selectedId, setSelectedId] = useState<string>(SAMPLE_COURSES[0].id)
  const [deanMoves, setDeanMoves] = useState(false)
  const [holyDay, setHolyDay] = useState(false)
  const [varsity, setVarsity] = useState(false)
  const [showEmail, setShowEmail] = useState(false)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [noteDraft, setNoteDraft] = useState({
    showedUp: "",
    prepare: "",
    hours: "8",
    season: "December 2025",
  })
  const [formError, setFormError] = useState("")

  useEffect(() => {
    const storedCourses = readJson<Course[]>(COURSE_KEY)
    const storedNotes = readJson<ExamNote[]>(NOTE_KEY)
    if (storedCourses && storedCourses.length >= 0 && storedCourses.every(isCourse)) {
      setCourses(storedCourses)
      if (storedCourses[0]) setSelectedId(storedCourses[0].id)
    }
    if (storedNotes && storedNotes.every(isNote)) {
      const extras = storedNotes.filter((note) => !note.sample)
      setNotes([...SAMPLE_NOTES, ...extras])
    }
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(COURSE_KEY, JSON.stringify(courses))
    localStorage.setItem(NOTE_KEY, JSON.stringify(notes.filter((note) => !note.sample)))
  }, [courses, notes, ready])

  const selected = courses.find((course) => course.id === selectedId) ?? courses[0] ?? null
  const plan = useMemo(
    () =>
      buildPlan(courses, notes, {
        deanMoves,
        holyDay,
        varsity,
        conflictId: selected?.id ?? null,
      }),
    [courses, notes, deanMoves, holyDay, varsity, selected?.id],
  )

  const selectedNotes = selected
    ? notes.filter((note) => note.examGroup === selected.group)
    : []

  function addCourse() {
    const name = draft.name.trim()
    if (!name) {
      setFormError("Name the course.")
      return
    }
    const course: Course = {
      id: crypto.randomUUID(),
      name,
      instructor: draft.instructor.trim(),
      group: draft.group,
      format: draft.format,
      note: draft.note.trim(),
    }
    setCourses((current) => [...current, course])
    setSelectedId(course.id)
    setDraft(emptyDraft)
    setFormError("")
    setAdding(false)
  }

  function addNote() {
    if (!selected) return
    const showedUp = noteDraft.showedUp.trim()
    const prepare = noteDraft.prepare.trim()
    const hours = Number(noteDraft.hours)
    if (showedUp.length < 8 || prepare.length < 8) {
      setFormError("Say what showed up, and how you would prepare. A sentence each is enough.")
      return
    }
    if (!Number.isFinite(hours) || hours < 1 || hours > 40) {
      setFormError("Hours should be between 1 and 40.")
      return
    }
    const note: ExamNote = {
      id: crypto.randomUUID(),
      examGroup: selected.group,
      courseName: selected.name,
      instructor: selected.instructor.trim(),
      format: selected.format,
      showedUp,
      prepare,
      hours: Math.round(hours),
      season: noteDraft.season.trim() || "This term",
      sample: false,
    }
    setNotes((current) => [note, ...current])
    setNoteDraft({ showedUp: "", prepare: "", hours: "8", season: "December 2025" })
    setFormError("")
  }

  function resetSample() {
    setCourses(SAMPLE_COURSES)
    setNotes(SAMPLE_NOTES)
    setSelectedId(SAMPLE_COURSES[0].id)
    setDeanMoves(false)
    setHolyDay(false)
    setVarsity(false)
    setFormError("")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
              Yale College · Fall 2026
            </p>
            <h1 className="font-heading text-4xl tracking-tight sm:text-5xl">Reading Period</h1>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground sm:text-right">
            Your courses, the real exam grid, and a plan for the days between the last class and the last blue book.
          </p>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="flex flex-col gap-3 border border-foreground/15 bg-card p-4 sm:p-5">
          <p className="font-heading text-2xl leading-snug">{plan.headline}</p>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{plan.detail}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="secondary">{plan.wantedHours}h this load wants</Badge>
            <Badge variant="outline">{plan.heldHours}h the calendar holds</Badge>
            {plan.rules.firstTwoDays && <Badge variant="destructive">First two days</Badge>}
            {plan.rules.consecutive && <Badge variant="destructive">Back to back</Badge>}
            {plan.rules.fourSlot && <Badge variant="destructive">Four-slot window</Badge>}
          </div>
          {plan.rules.qualifies && plan.move && (
            <div className="flex flex-col gap-3 border-t border-foreground/10 pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deanMoves}
                  onChange={(event) => setDeanMoves(event.target.checked)}
                />
                Plan as if the dean moves {plan.move.name}
              </label>
              {plan.email && (
                <div>
                  <Button variant="outline" size="sm" onClick={() => setShowEmail((open) => !open)}>
                    {showEmail ? "Hide the dean email" : "Draft the dean email"}
                  </Button>
                  {showEmail && (
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed">{plan.email}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={holyDay} onChange={(event) => setHolyDay(event.target.checked)} />
              A holy day conflicts with the selected course
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={varsity} onChange={(event) => setVarsity(event.target.checked)} />
              A varsity contest conflicts with the selected course
            </label>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Groups and dates are the Fall 2026 grid in the Yale College Programs of Study. Common groups such as 61, 63, 64, 65, and 69 are typical assignments, not a promise about every section. The postponement rules are Academic Regulations, section H. The dean decides. Travel is not a reason. The checker treats Saturday and Sunday as a break.
          </p>
        </section>

        {plan.clashes.map((clash) => (
          <p key={clash} className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {clash}
          </p>
        ))}

        <ExamGrid courses={courses} moveId={deanMoves ? plan.move?.id ?? null : null} onSelect={setSelectedId} selectedId={selected?.id ?? null} />

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-2xl">How to spend it</h2>
              <p className="text-xs text-muted-foreground">Earliest exam first</p>
            </div>
            <ol className="flex flex-col">
              {plan.blocks.map((block) => (
                <li key={block.id} className="grid grid-cols-[7.5rem_1fr] gap-3 border-t border-foreground/10 py-4 sm:grid-cols-[11rem_1fr]">
                  <div>
                    <p className="text-xs tracking-wide text-primary uppercase">{block.kicker}</p>
                    <p className="text-sm font-medium">{block.when}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {block.lines.map((line) => (
                      <p key={line} className="text-sm leading-relaxed">
                        {line}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
            {plan.uncovered.length > 0 && (
              <div className="border border-foreground/15 bg-card p-4">
                <h3 className="font-heading text-lg">What does not fit</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {plan.uncovered.map((line) => (
                    <li key={line} className="text-sm leading-relaxed">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="flex flex-col gap-4 lg:sticky lg:top-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading text-2xl">Your courses</h2>
              <Button size="sm" onClick={() => { setAdding(true); setFormError("") }}>
                Add a course
              </Button>
            </div>
            <ul className="flex flex-col gap-2">
              {courses.map((course) => {
                const slot = slotFor(course.group)
                const active = course.id === selected?.id
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(course.id)}
                      className={`w-full border px-3 py-3 text-left ${active ? "border-primary bg-primary text-primary-foreground" : "border-foreground/15 bg-card"}`}
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block font-medium">{course.name}</span>
                          <span className={`mt-1 block text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {slot ? `${slot.shortDay} · ${slot.time}` : course.group === "0" ? "Paper due Tue Dec 22" : "Time arranged"}
                            {" · "}
                            {formatLabel(course.format)}
                            {" · "}
                            {hoursFor(course, notes)}h
                          </span>
                        </span>
                        {plan.move?.id === course.id && plan.rules.qualifies && (
                          <span className={`text-xs ${active ? "text-primary-foreground" : "text-destructive"}`}>Move this</span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
              {courses.length === 0 && (
                <li className="border border-dashed border-foreground/20 px-3 py-6 text-sm text-muted-foreground">
                  No courses yet. Add the ones you are actually taking, or load the sample load.
                </li>
              )}
            </ul>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={resetSample}>
                Load the sample load
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCourses([])
                  setSelectedId("")
                }}
              >
                Clear courses
              </Button>
            </div>

            {selected && (
              <CoursePanel
                course={selected}
                notes={selectedNotes}
                noteDraft={noteDraft}
                setNoteDraft={setNoteDraft}
                formError={formError}
                onNoteChange={(note) =>
                  setCourses((current) => current.map((course) => (course.id === selected.id ? { ...course, note } : course)))
                }
                onInstructor={(instructor) =>
                  setCourses((current) => current.map((course) => (course.id === selected.id ? { ...course, instructor } : course)))
                }
                onRemove={() => {
                  setCourses((current) => current.filter((course) => course.id !== selected.id))
                }}
                onAddNote={addNote}
                onDeleteNote={(id) => setNotes((current) => current.filter((note) => note.id !== id))}
                using={noteFor(selected, notes)}
              />
            )}
          </section>
        </div>
      </main>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a course</DialogTitle>
            <DialogDescription>
              Use the exam group from Yale Course Search. The meeting pattern is what places it on the grid.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Field label="Course">
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Introductory economics" />
            </Field>
            <Field label="Instructor">
              <Input value={draft.instructor} onChange={(event) => setDraft({ ...draft, instructor: event.target.value })} placeholder="Name from the syllabus" />
            </Field>
            <Field label="Exam group">
              <Select
                value={draft.group}
                onValueChange={(value) => {
                  if (value) setDraft({ ...draft, group: value })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUP_OPTIONS.map((option) => (
                    <SelectItem key={option.group} value={option.group}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="What you will sit">
              <Select
                value={draft.format}
                onValueChange={(value) => {
                  if (value) setDraft({ ...draft, format: value as FormatId })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </div>
          <DialogFooter>
            <Button onClick={addCourse}>Add to the grid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ExamGrid({
  courses,
  selectedId,
  moveId,
  onSelect,
}: {
  courses: Course[]
  selectedId: string | null
  moveId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-2xl">The grid</h2>
      <div className="flex flex-col gap-4 md:hidden">
        {GRID_DAYS.slice(0, 4).map((day) => (
          <DayStack key={day.short} day={day} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />
        ))}
        <p className="border border-dashed border-foreground/20 px-3 py-3 text-sm text-muted-foreground">
          Saturday and Sunday, December 19–20. No exams. Other coursework is due Sunday. Term papers are due Tuesday the 22nd.
        </p>
        {GRID_DAYS.slice(4).map((day) => (
          <DayStack key={day.short} day={day} courses={courses} selectedId={selectedId} moveId={moveId} onSelect={onSelect} />
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <div className="min-w-[42rem]">
          <div className="grid grid-cols-[5.5rem_repeat(4,1fr)_8rem_repeat(2,1fr)] gap-1">
            <div />
            {GRID_DAYS.slice(0, 4).map((day) => (
              <div key={day.short} className="px-1 text-xs font-medium tracking-wide uppercase">{day.short}</div>
            ))}
            <div className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Dec 19–20</div>
            {GRID_DAYS.slice(4).map((day) => (
              <div key={day.short} className="px-1 text-xs font-medium tracking-wide uppercase">{day.short}</div>
            ))}
            {TIME_LABELS.map((time, timeIndex) => (
              <GridRow
                key={time}
                time={time}
                timeIndex={timeIndex}
                courses={courses}
                selectedId={selectedId}
                moveId={moveId}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function GridRow({
  time,
  timeIndex,
  courses,
  selectedId,
  moveId,
  onSelect,
}: {
  time: string
  timeIndex: number
  courses: Course[]
  selectedId: string | null
  moveId: string | null
  onSelect: (id: string) => void
}) {
  const cells = [
    ...GRID_DAYS.slice(0, 4).map((day) => day.times[timeIndex]),
    "weekend" as const,
    ...GRID_DAYS.slice(4).map((day) => day.times[timeIndex]),
  ]
  return (
    <>
      <div className="py-2 text-xs text-muted-foreground">{time}</div>
      {cells.map((group, index) => {
        if (group === "weekend") {
          return (
            <div key={`${time}-weekend`} className="border border-dashed border-foreground/15 bg-muted/60 px-2 py-2 text-xs leading-snug text-muted-foreground">
              {timeIndex === 1 ? "No exams. Papers wait here." : ""}
            </div>
          )
        }
        const matches = group ? courses.filter((course) => course.group === group) : []
        return (
          <div key={`${time}-${index}`} className="min-h-16 border border-foreground/10 bg-card p-1.5">
            {matches.length === 0 && <span className="text-xs text-muted-foreground/40">{group ? "" : "—"}</span>}
            {matches.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => onSelect(course.id)}
                className={`mb-1 block w-full px-1.5 py-1 text-left text-xs leading-snug ${
                  course.id === selectedId
                    ? "bg-primary text-primary-foreground"
                    : course.id === moveId
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10"
                }`}
              >
                {course.name}
              </button>
            ))}
          </div>
        )
      })}
    </>
  )
}

function DayStack({
  day,
  courses,
  selectedId,
  moveId,
  onSelect,
}: {
  day: { short: string; times: (string | null)[] }
  courses: Course[]
  selectedId: string | null
  moveId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="border border-foreground/15 bg-card">
      <p className="border-b border-foreground/10 px-3 py-2 text-xs font-medium tracking-wide uppercase">{day.short}</p>
      {day.times.map((group, index) => {
        const matches = group ? courses.filter((course) => course.group === group) : []
        return (
          <div key={TIME_LABELS[index]} className="flex items-start gap-3 border-t border-foreground/10 px-3 py-2">
            <span className="w-16 shrink-0 text-xs text-muted-foreground">{TIME_LABELS[index]}</span>
            <div className="flex flex-1 flex-col gap-1">
              {matches.length === 0 && <span className="text-xs text-muted-foreground/60">{group ? "Open" : "—"}</span>}
              {matches.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => onSelect(course.id)}
                  className={`px-2 py-1 text-left text-sm ${course.id === selectedId ? "bg-primary text-primary-foreground" : course.id === moveId ? "bg-destructive/15 text-destructive" : "bg-primary/10"}`}
                >
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

function CoursePanel({
  course,
  notes,
  noteDraft,
  setNoteDraft,
  formError,
  onNoteChange,
  onInstructor,
  onRemove,
  onAddNote,
  onDeleteNote,
  using,
}: {
  course: Course
  notes: ExamNote[]
  noteDraft: { showedUp: string; prepare: string; hours: string; season: string }
  setNoteDraft: (value: { showedUp: string; prepare: string; hours: string; season: string }) => void
  formError: string
  onNoteChange: (note: string) => void
  onInstructor: (instructor: string) => void
  onRemove: () => void
  onAddNote: () => void
  onDeleteNote: (id: string) => void
  using: ExamNote | null
}) {
  const slot = slotFor(course.group)
  return (
    <div className="flex flex-col gap-4 border border-foreground/15 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-xl">{course.name}</h3>
          <p className="text-xs text-muted-foreground">
            {slot ? `${slot.day}, ${slot.time}` : course.group === "0" ? "Term paper due Tuesday, December 22" : "Group 50, time from the syllabus"}
            {" · "}
            {formatLabel(course.format)}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <Field label="Instructor, for matching notes">
        <Input value={course.instructor} onChange={(event) => onInstructor(event.target.value)} placeholder="Name from the syllabus" />
      </Field>
      <Field label="Your own prep note">
        <Textarea
          value={course.note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="What you still do not understand"
          rows={3}
        />
      </Field>
      <div>
        <h4 className="text-sm font-medium">What students remember</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Sample notes are invented so the plan has something to read. A note you add is saved on this device and becomes the advice the plan uses
          {using ? `, currently the ${using.sample ? "sample" : "note"} from ${using.season}` : ""}.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id} className="border-t border-foreground/10 pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {note.sample ? "Sample" : "Your note"} · {note.season}
                {note.instructor ? ` · ${note.instructor}` : ""}
              </p>
              {!note.sample && (
                <button type="button" className="text-xs text-muted-foreground underline" onClick={() => onDeleteNote(note.id)}>
                  Delete
                </button>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed">{note.showedUp}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{note.prepare}</p>
            <p className="mt-1 text-xs">{note.hours}h · {formatLabel(note.format)}</p>
          </li>
        ))}
        {notes.length === 0 && (
          <li className="text-sm text-muted-foreground">No notes for this exam group yet.</li>
        )}
      </ul>
      <div className="flex flex-col gap-3 border-t border-foreground/10 pt-3">
        <h4 className="text-sm font-medium">Leave a note for this exam group</h4>
        <Field label="What actually showed up">
          <Textarea
            value={noteDraft.showedUp}
            onChange={(event) => setNoteDraft({ ...noteDraft, showedUp: event.target.value })}
            rows={2}
            maxLength={400}
          />
        </Field>
        <Field label="How to spend reading period">
          <Textarea
            value={noteDraft.prepare}
            onChange={(event) => setNoteDraft({ ...noteDraft, prepare: event.target.value })}
            rows={2}
            maxLength={400}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours it took">
            <Input
              type="number"
              min={1}
              max={40}
              value={noteDraft.hours}
              onChange={(event) => setNoteDraft({ ...noteDraft, hours: event.target.value })}
            />
          </Field>
          <Field label="When">
            <Input
              value={noteDraft.season}
              onChange={(event) => setNoteDraft({ ...noteDraft, season: event.target.value })}
              maxLength={40}
            />
          </Field>
        </div>
        {formError && <p className="text-sm text-destructive">{formError}</p>}
        <Button type="button" onClick={onAddNote}>
          Use this in the plan
        </Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function isCourse(value: Course): boolean {
  return Boolean(value && typeof value.id === "string" && typeof value.name === "string" && typeof value.group === "string")
}

function isNote(value: ExamNote): boolean {
  return Boolean(value && typeof value.id === "string" && typeof value.prepare === "string")
}
