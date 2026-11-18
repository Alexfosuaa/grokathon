# YScholar

**Your AI-powered study companion at Yale.** Built for the Grokathon.

## Demo

https://github.com/Alexfosuaa/grokathon/blob/main/demo.mp4

## The Problem

Yale students juggle 4–5 courses with a compressed finals period — 8 days, rigid exam groups, overlapping slots. There's no single tool that connects their course load, exam schedule, grade targets, and study strategy. Students piece it together across spreadsheets, GroupMe threads, and word-of-mouth exam tips that disappear every semester.

The result: wasted study time, missed exam intel, and no way to know if you're on track until it's too late.

## What YScholar Does

YScholar is a single dashboard that brings together everything a Yale student needs during reading period and finals:

- **AI Study Planner** — Grok AI generates daily and weekly study plans based on your courses, exam dates, formats, and target grades. Plans adjust as you log activity.
- **Grade Tracker** — Enter syllabus weights and scores. See exactly what you need on the final to hit your target grade.
- **Finals Grid** — The full Fall 2026 Yale exam grid (December 15–22). Your exams are highlighted. Spot conflicts and check dean's postponement eligibility.
- **Exam Huddle** — Anonymous exam feedback from Yale students. Difficulty ratings, what showed up, and tips — real intel from people who already took the exam.
- **Grok AI Chat** — Ask Grok anything about your courses. It knows your schedule, your grades, your exam formats. Personalized answers, not generic study advice.
- **Smart Notifications** — Grok surfaces study suggestions as toasts throughout the session.
- **Calendar Integration** — Connect Canvas and Google Calendar feeds for smarter scheduling.
- **Yale-Only Access** — `@yale.edu` sign-in, residential college, class year, major.

## How It Works

1. Sign in with your `@yale.edu` email
2. Complete two-step onboarding (profile + courses)
3. The dashboard opens with your AI-generated study plan
4. Navigate the sidebar: Today, This Week, Courses, Grades, Calendar, Finals, Huddle, Settings
5. Chat with Grok AI anytime via the floating assistant

Grok AI runs in the background, analyzing your course load, exam schedule, grade targets, and Huddle feedback to generate adaptive suggestions.

## Built with Grok AI

This project was built during the Grokathon using Grok AI as the development assistant. Grok helped with:

- Architecture and component design
- Study plan generation algorithms
- UI/UX design decisions
- Code generation and debugging

The in-app AI assistant is also powered by Grok, providing real-time study suggestions and streaming chat via the xAI API.

## The Gap: Adaptive Learning (Coming Soon)

The biggest gap in student tools today is personalization. Every student studies differently — some need 14 hours for physics and 4 for a seminar; others are the opposite. Current tools treat everyone the same.

YScholar's next milestone is a **personalized learning model** that adapts to each student over time:

- **Learn your pace** — Track how long you actually spend per course and predict future study needs based on your history, not generic estimates.
- **Identify weak spots** — Detect which formats (problem sets vs. essays vs. blue books) take you longer and shift time accordingly.
- **Optimize scheduling** — Learn when you're most productive (morning vs. night, long blocks vs. short sprints) and suggest study windows during peak focus.
- **Smarter Huddle** — Weight exam tips from students with similar study profiles, so the advice you see comes from people who learn like you.
- **Spaced repetition** — Integrate forgetting curves so Grok reminds you to revisit material at the optimal interval before your exam.

The foundation is already in place: YScholar tracks courses, grades, exam formats, study plans, and peer feedback. The next step is feeding that data back into Grok to create a continuously improving, student-specific model.

## What We'd Build with More Time

- **Canvas auto-import** — Pull courses, assignments, and grades directly from the Canvas API instead of manual entry.
- **Study session timer** — Built-in Pomodoro timer that logs study hours per course automatically, feeding the adaptive model.
- **Collaborative study groups** — Match students in the same exam group for group study sessions, with Grok suggesting optimal group sizes and times.
- **Historical Huddle analytics** — Aggregate years of exam feedback into difficulty trends, topic frequency charts, and format breakdowns per course.
- **Mobile app** — React Native companion for on-the-go study tracking and push notification reminders.
- **Multi-semester tracking** — Carry study profiles across semesters so Grok's model improves year over year.
- **Professor-side dashboard** — Anonymous, aggregated study data so professors can see where students struggle and adjust accordingly.
- **Yale SSO integration** — CAS authentication for real Yale identity verification.

## Tech Stack

- **Next.js 15** with App Router
- **React 19** with client-side state
- **Tailwind CSS 4** for styling
- **shadcn/ui** components
- **Grok API** (xAI) for real-time AI chat and study assistance
- **TypeScript** throughout
- **localStorage** for client-side persistence

## Run It

```bash
git clone https://github.com/Alexfosuaa/grokathon.git
cd grokathon
npm install
echo "GROK_API_KEY=your-xai-api-key" > .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Data & Privacy

Everything stays in your browser via localStorage — no backend database, no data leaves your machine except Grok AI chat queries. Sample data is clearly labeled. Exam groups and the December 15–22 schedule come from the Yale College Programs of Study for 2026–2027. Postponement rules come from Academic Regulations, section H. All numbers are study suggestions, not official grades.
