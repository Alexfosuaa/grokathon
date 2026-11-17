export const FORMATS = [
  { id: "blue-book", label: "Blue book" },
  { id: "problem-set", label: "Problem set" },
  { id: "essay", label: "Essay or close reading" },
  { id: "oral", label: "Oral" },
  { id: "mixed", label: "Mixed" },
  { id: "paper", label: "Term paper" },
] as const

export type FormatId = (typeof FORMATS)[number]["id"]

export type Slot = {
  group: string
  order: number
  day: string
  shortDay: string
  time: string
  half: "first" | "second"
}

/** Fall 2026 final examination grid, from the Yale College Programs of Study. */
export const SLOTS: Slot[] = [
  { group: "61", order: 0, day: "Tuesday, December 15", shortDay: "Tue Dec 15", time: "9:00 a.m.", half: "first" },
  { group: "34", order: 1, day: "Tuesday, December 15", shortDay: "Tue Dec 15", time: "2:00 p.m.", half: "first" },
  { group: "23", order: 2, day: "Tuesday, December 15", shortDay: "Tue Dec 15", time: "7:00 p.m.", half: "first" },
  { group: "64", order: 3, day: "Wednesday, December 16", shortDay: "Wed Dec 16", time: "9:00 a.m.", half: "first" },
  { group: "24", order: 4, day: "Wednesday, December 16", shortDay: "Wed Dec 16", time: "2:00 p.m.", half: "first" },
  { group: "63", order: 5, day: "Wednesday, December 16", shortDay: "Wed Dec 16", time: "7:00 p.m.", half: "first" },
  { group: "22", order: 6, day: "Thursday, December 17", shortDay: "Thu Dec 17", time: "9:00 a.m.", half: "first" },
  { group: "65", order: 7, day: "Thursday, December 17", shortDay: "Thu Dec 17", time: "2:00 p.m.", half: "first" },
  { group: "33", order: 8, day: "Thursday, December 17", shortDay: "Thu Dec 17", time: "7:00 p.m.", half: "first" },
  { group: "37", order: 9, day: "Friday, December 18", shortDay: "Fri Dec 18", time: "9:00 a.m.", half: "first" },
  { group: "26", order: 10, day: "Friday, December 18", shortDay: "Fri Dec 18", time: "2:00 p.m.", half: "first" },
  { group: "69", order: 12, day: "Monday, December 21", shortDay: "Mon Dec 21", time: "9:00 a.m.", half: "second" },
  { group: "27", order: 13, day: "Monday, December 21", shortDay: "Mon Dec 21", time: "2:00 p.m.", half: "second" },
  { group: "31", order: 14, day: "Monday, December 21", shortDay: "Mon Dec 21", time: "7:00 p.m.", half: "second" },
  { group: "36", order: 15, day: "Tuesday, December 22", shortDay: "Tue Dec 22", time: "9:00 a.m.", half: "second" },
  { group: "32", order: 16, day: "Tuesday, December 22", shortDay: "Tue Dec 22", time: "2:00 p.m.", half: "second" },
]

export const GRID_DAYS: { short: string; times: (string | null)[] }[] = [
  { short: "Tue 15", times: ["61", "34", "23"] },
  { short: "Wed 16", times: ["64", "24", "63"] },
  { short: "Thu 17", times: ["22", "65", "33"] },
  { short: "Fri 18", times: ["37", "26", null] },
  { short: "Mon 21", times: ["69", "27", "31"] },
  { short: "Tue 22", times: ["36", "32", "makeup"] },
]

export const TIME_LABELS = ["9:00 a.m.", "2:00 p.m.", "7:00 p.m."]

export const GROUP_OPTIONS: { group: string; label: string }[] = [
  { group: "61", label: "61 · Languages, typical · Tue Dec 15, 9:00 a.m." },
  { group: "34", label: "34 · MWF 11:35 · Tue Dec 15, 2:00 p.m." },
  { group: "23", label: "23 · TTh 10:30 · Tue Dec 15, 7:00 p.m." },
  { group: "64", label: "64 · Intro economics, typical · Wed Dec 16, 9:00 a.m." },
  { group: "24", label: "24 · TTh 11:35 · Wed Dec 16, 2:00 p.m." },
  { group: "63", label: "63 · Intro English, typical · Wed Dec 16, 7:00 p.m." },
  { group: "22", label: "22 · TTh 9:25 · Thu Dec 17, 9:00 a.m." },
  { group: "65", label: "65 · Physics, typical · Thu Dec 17, 2:00 p.m." },
  { group: "33", label: "33 · MWF 10:30 · Thu Dec 17, 7:00 p.m." },
  { group: "37", label: "37 · MWF after 2:00 · Fri Dec 18, 9:00 a.m." },
  { group: "26", label: "26 · TTh 1:30 · Fri Dec 18, 2:00 p.m." },
  { group: "69", label: "69 · Intro math, typical · Mon Dec 21, 9:00 a.m." },
  { group: "27", label: "27 · TTh after 2:00 · Mon Dec 21, 2:00 p.m." },
  { group: "31", label: "31 · MWF 8:20 · Mon Dec 21, 7:00 p.m." },
  { group: "36", label: "36 · MWF 1:30 · Tue Dec 22, 9:00 a.m." },
  { group: "32", label: "32 · MWF 9:25 · Tue Dec 22, 2:00 p.m." },
  { group: "0", label: "0 · No regular exam · term essay or other final exercise" },
  { group: "50", label: "50 · Time arranged on the syllabus" },
]

const FIRST_HALF_ORDERS = SLOTS.filter((slot) => slot.order < 12).map((slot) => slot.group)

export function slotFor(group: string): Slot | null {
  return SLOTS.find((slot) => slot.group === group) ?? null
}

export function formatLabel(format: FormatId): string {
  return FORMATS.find((item) => item.id === format)?.label ?? format
}

/** Occupied flags for the 12 first-half slots, including the empty Friday 7 p.m. */
export function firstHalfFlags(groups: string[]): boolean[] {
  const set = new Set(groups)
  const byOrder = new Map(SLOTS.filter((slot) => slot.half === "first").map((slot) => [slot.order, slot.group]))
  return Array.from({ length: 12 }, (_, order) => {
    const group = byOrder.get(order)
    return group !== undefined && set.has(group)
  })
}

export function secondHalfFlags(groups: string[]): boolean[] {
  const set = new Set(groups)
  const orders = [12, 13, 14, 15, 16, 17]
  const byOrder = new Map(SLOTS.filter((slot) => slot.half === "second").map((slot) => [slot.order, slot.group]))
  return orders.map((order) => {
    const group = byOrder.get(order)
    return group !== undefined && set.has(group)
  })
}

function hasBackToBack(flags: boolean[]): boolean {
  for (let i = 0; i <= flags.length - 3; i++) {
    if (flags[i] && flags[i + 1] && flags[i + 2]) return true
  }
  return false
}

function hasFourSlot(flags: boolean[]): boolean {
  for (let i = 0; i <= flags.length - 4; i++) {
    let count = 0
    for (let j = 0; j < 4; j++) if (flags[i + j]) count += 1
    if (count >= 3) return true
  }
  return false
}

export type DeanRules = {
  firstTwoDays: boolean
  consecutive: boolean
  fourSlot: boolean
  qualifies: boolean
}

export function deanRules(groups: string[]): DeanRules {
  const examGroups = groups.filter((group) => FIRST_HALF_ORDERS.includes(group) || SLOTS.some((slot) => slot.group === group))
  const first = firstHalfFlags(examGroups)
  const second = secondHalfFlags(examGroups)
  const firstTwoDays = first.slice(0, 6).filter(Boolean).length >= 3
  const consecutive = hasBackToBack(first) || hasBackToBack(second)
  const fourSlot = hasFourSlot(first) || hasFourSlot(second)
  return {
    firstTwoDays,
    consecutive,
    fourSlot,
    qualifies: firstTwoDays || consecutive || fourSlot,
  }
}
