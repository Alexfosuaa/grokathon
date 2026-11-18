# YScholar

Your AI-powered study companion at Yale. Built for the Grokathon.

YScholar helps Yale College students plan their semester, track grades, prepare for finals, and share exam feedback — all in one place, powered by Grok AI running in the background.

## Features

- **AI Study Planner** — Grok AI generates personalized weekly study plans that adjust based on your logged activity, upcoming deadlines, and exam schedule.
- **Grade Tracker** — Enter your syllabus weights and scores. YScholar tells you what you need on the final to hit your target grade.
- **Finals Grid** — The full Fall 2026 exam grid from the Yale College Programs of Study. See your exams laid out by day and time, spot conflicts, and check if you qualify for a dean's postponement.
- **Exam Huddle** — Anonymous exam feedback from Yale students. See what showed up on past exams for your courses, difficulty ratings, and tips. After you finish an exam, pay it forward.
- **Calendar** — Import your Canvas calendar feed. Personal events (The Game, a concert, a trip) shift your study suggestions earlier in the week.
- **Smart Notifications** — Grok AI surfaces suggestions as toasts: what to study, when to switch courses, how to allocate your reading period.
- **Onboarding** — Yale-only sign-in, class year, residential college, major. Load sample courses or add your own.
- **Settings** — Connect Canvas and Google Calendar. Manage your profile. Reset data.

## How it works

1. Sign in with your `@yale.edu` email
2. Complete the two-step onboarding (profile + courses)
3. The dashboard opens with your AI-generated study plan for today
4. Navigate the sidebar: Today, This Week, Courses, Grades, Calendar, Finals, Huddle, Settings

Grok AI runs in the background, analyzing your course load, exam schedule, grade targets, and study logs to generate adaptive suggestions. The AI recalculates when you log study sessions, change target grades, or update your calendar.

## Built with Grok AI

This project was built during the Grokathon using Grok AI as the development assistant. Grok helped with:

- Architecture and component design
- Study plan generation algorithms
- UI/UX design decisions
- Code generation and debugging

The in-app AI assistant is also powered by Grok, providing real-time study suggestions and adaptive planning.

## Tech stack

- **Next.js 15** with App Router
- **React 19** with client-side state
- **Tailwind CSS 4** for styling
- **shadcn/ui** components
- **TypeScript** throughout
- **localStorage** for persistence (no backend needed)

## Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What the grid is based on

Exam groups, meeting times, and the December 15-22 schedule come from the Yale College Programs of Study for 2026-2027. The calendar comes from the Yale College calendar. Postponement rules come from Academic Regulations, section H. A residential college dean decides. The app is a planning aid.

All numbers are suggestions, not grades in Yale Hub. Yale College does not publish a percentage scale. Sample data stays labeled as samples. Everything stays in this browser.
