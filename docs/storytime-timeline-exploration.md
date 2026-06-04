# Story Time — Listening Timeline

*Exploratory requirements & brainstorming · v0.1*

## The one big feature

Story Time's centerpiece is a **listening timeline**: a visual history of *when* and *how* you engaged with a book. The primary job is utility — you can't remember exactly where you left off (or you fell asleep, or you jumped around), and you need to find the right spot to jump back to. The secondary job is delight — it should be something nice to browse and, eventually, a foundation for analytics.

> **North star:** purposeful first, pretty second. Help the user find their spot quickly; don't over-engineer for use cases that aren't the main thing.

---

## Core concept

A **single vertical timeline** with a literal line running through it that you scroll with your thumb. Sessions are nodes along the line. It should feel like *one continuous thing you're browsing*, not a collection of separate screens or cards you jump between.

Key design decisions we landed on:

- **Vertical scroll**, not horizontal — natural thumb movement, and it leaves room for horizontal labels on events.
- **Day/period borders** are subtle: translucent background bands or light separators, never hard breaks that fragment the single-thread feel.
- **Expansion happens in place.** Tapping a node grows it inline — like zooming into that section of the line — rather than navigating away.

---

## Signal vs. noise: sessions and events

The fundamental distinction:

- **Session** — a meaningful block of listening (e.g., "listened for 10 minutes"). This is what matters.
- **Event** — a discrete interaction *within* a session (a 30s rewind, a 15s fast-forward, a pause, a sleep-timer start). Mostly implementation detail / noise.

**Default behavior: collapse.** A session with lots of micro-activity shows as a summary:

> *"4 hours · 3 events"*

Tap to expand inline and reveal the discrete events. This keeps the default view dense with meaning and lets the user drill in only where they care.

### Candidate event types

- Pause / resume
- Rewind / fast-forward (the micro-scrubs that normally collapse away)
- **Smart rewind on resume** — when paused past a threshold (e.g. >2 min), auto-rewind 15–30s on resume. Show as a *subtle annotation* (small rewind icon by the timestamp), not a full event.
- **Sleep timer** — start time, stop time, and the book position at each. Worth *highlighting* differently (e.g. a translucent overlay across the session) so you can see exactly where you drifted off.
- Speed change (e.g. 1x → 1.5x mid-session) — *open question: signal or noise?*
- Chapter jumps (esp. relevant in book-progress view) — *open question: how visually obvious?*

---

## Two ways to read the timeline

A toggle between two orderings that answer different questions:

### 1. Chronological view — "what did I listen to when?"
Like a listening journal organized by time.
> Tuesday night → Ch. 3 (sleep timer) · Monday → Ch. 13 · Sunday → Ch. 10

Great for nonfiction / random-chapter listening (the Neil deGrasse Tyson pattern: drop into a chapter, set a sleep timer, done).

### 2. Book-progress view — "how did I move through the book?"
Ordered by position in the book rather than by clock time. Shows the actual journey through chapters — where you lingered, where you jumped, where lots of stops-and-starts clustered (e.g. around Ch. 5). Naturally scattered for nonfiction; that's fine — it's telling a different story.

---

## Handling empty time: gap compression

Don't make people scroll through time where nothing happened. Large idle stretches collapse into a single block that spans the gap:

> *"No activity · 48 hours" (Tue–Thu)*

You only scroll through time where things actually happened. This keeps the timeline dense *and* gives context for how much time passed. (Bonus: collapsed gaps are cheap to render.)

---

## Progressive disclosure at multiple scales

Navigation *is* collapsing/expanding — no separate scrubber needed. The timeline nests collapsible chunks at different time scales:

- A single bullet for **"Last week"** → tap to expand into **days** (loads on demand)
- A day → tap to expand into **sessions**
- A session → tap to expand into **events**

So you might scroll a little, hit a "Last week" bullet, and choose whether to load it. Clean initial view, zoom in exactly where you want, nothing loaded upfront that you don't need.

Possible scales to support: current year · this/last month · last week · day · session · event.

---

## Performance

The timeline must stay snappy with **years** of history per book, even though a typical session only scrolls back a week or so.

- **Virtualized rendering** — only render the visible window (plus a small buffer); render dynamically as the user scrolls.
- **Collapsed gaps and collapsed period-bullets** keep the node count low by default.
- **Load-on-expand** — don't fetch/render a week's detail until the user opens it.

---

## Companion features (context, not the focus)

These are quality-of-life features that the timeline makes legible, but they aren't the headline:

- **Smart rewind on resume** — auto-rewind after long pauses (threshold-based).
- **Smart sleep timer** — incl. the morning use case: *"I fell asleep — let me set my position back to somewhere after the timer started but before it ended."* The sleep-timer highlight on the timeline directly supports finding that spot.

---

## Open questions for visual exploration

These are best answered by sketching / playground prototyping rather than spec'ing now:

1. Long overnight pauses — big visible gap vs. collapsed note? (Leaning: collapse.)
2. Speed changes — visualize or treat as noise?
3. Chapter jumps in book-progress view — obvious or subtle?
4. How deep should drill-down go by default before it feels like too much?
5. What does an expanded session actually look like — inline list, mini-timeline, something else?
6. Visual language for the sleep-timer window (overlay? bracket? shaded span?).

---

## Quick glossary

| Term | Meaning |
|---|---|
| **Session** | A meaningful block of listening; the primary unit on the timeline. |
| **Event** | A discrete interaction within a session (pause, rewind, sleep timer, etc.). |
| **Gap block** | A collapsed span representing idle time with no activity. |
| **Period bullet** | A collapsed chunk at a larger scale (week/month/year) that expands on tap. |
| **Chronological view** | Timeline ordered by clock time. |
| **Book-progress view** | Timeline ordered by position in the book. |
