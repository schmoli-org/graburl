# Story Time — Listening Timeline Design

*Design decisions landed via interactive exploration. The visual model below is what the companion playground (`storytime-timeline-playground.html`) renders. Targets a future implementer building the SwiftUI view.*

Companion to: [`storytime-timeline-exploration.md`](./storytime-timeline-exploration.md) (the original requirements).

---

## Three row types

The timeline is a single vertical thread carrying three kinds of rows:

| Type | Purpose | Renders when |
|---|---|---|
| **Event row** | A past action or state transition at a specific timestamp | One per real user action (Resume, Pause, Chapter, Rewind, Sleep-set, …) |
| **Gap label** | Italic accent text between events, summarizing buffered micro-events | Only when there's a micro-burst count to display |
| **State anchor** | Single row at the very top — current playback state right now | Always, derived from the most recent session |

Pure duration between two adjacent events is *not* rendered. The surrounding timestamps recover it. Gap labels exist only to carry information the timestamps can't — specifically, counts of micro-events (rewinds, fast-forwards) that were buffered out of their own rows.

## Row layout

```
[ time-pill ]  [ icon-lane ]  [ title slot ]                    [ position ]
   8:43pm        ⏪              Rewind 30s                       3% (0h13m)
```

Anchored grid: `76px` time-pill column, `minmax(36px, max-content)` icon lane, `1fr` title, `auto` position. A single vertical line (`.timeline::before`) at `left: 118px` passes through every icon's center — that's the visual "thread."

**Icon = state/action type.** Pause and Resume are nullary; their icon fully expresses them.
**Title = parameters of that type.** Chapter name, rewind seconds, speed rate, sleep-timer minutes.
**Position right-justified, accent color.** Format: `7% (0h33m)` — percent of book + parenthesized timecode.

## Event vocabulary

| Event | Icon | Title | Notes |
|---|---|---|---|
| Resume | ▶ green outline | `Chapter N` *(+ `[↶ 30s]` tag if smart rewind)* | First row of every session |
| Pause (manual) | ⏸ | `Chapter N` | |
| Pause (sleep timer fired) | `Zz` | `Chapter N [🌙 15m]` | Same row as a Pause; only the icon + tag differ |
| Sleep timer set | 🌙 | `Sleep timer set` + sub `Nm countdown` | User intent that affects future state |
| Chapter boundary | 📖 | `Chapter N` | Automatic |
| Speed change | ⚡ | `1× → 1.25×` | |
| Rewind | ⏪ | `Rewind Ns` | Mid-playback |
| FF | ⏩ | `Skip Ns` | |

Two rules made the vocabulary cohere:

1. **Smart rewind is not its own event.** It's a tag on the Resume row that follows it. The action that *happened* was tap-play; the smart rewind is metadata on that action.
2. **Sleep timer firing IS the Pause** — not a separate "Sleep timer ended" event. Same playback transition, annotated with a sleep glyph. But **setting** the sleep timer **is** its own event — because it's a user action that schedules a future state change. The general principle: events are anything that affects, or schedules a change to, playback state.

## Ordering

**Chronological view is reverse-chronological.** Newest at top, scroll down to walk into the past:

- Top: "Now" state anchor
- Below: day-band header (`TODAY  Jun 1` — single line, baseline-aligned label + sub)
- Within a day: most-recent session first
- Within an expanded session: Pause at top, events stacking down, Resume at bottom
- No "no activity" labels between days — the day-band carries chronology; absence speaks for itself

The narrative side-panel reads forward-chronological (top = oldest action, bottom = newest) — deliberately mirrored from the timeline. The narrative is a *story*; the timeline is a *recency view*.

## Sessions are invisible

Sessions are an *interaction concept* (the unit of collapse), not a *visual concept*. There are no "Session started/ended" wrapper rows. A session is just the interval between a Resume and the next Pause. Collapsed → only the Resume row is visible. Expanded → all events between Resume and Pause render in reverse-chrono order.

**Latest session auto-expands on load.** The user opens to "what just happened" rather than a wall of summary rows.

## Collapse interaction

Each session carries a **toggle gap label** between its Resume row and its (rendered or unrendered) Pause. Same DOM element, two CSS-driven states:

- **Collapsed:** italic accent — `"23 min, 2 events ▾"`. Carries the session summary.
- **Expanded:** muted gray non-italic — `"collapse ▴"`. Distinct visual category from inner gap labels (which are italic accent).

Rendering both spans in the DOM and toggling visibility via the `.is-expanded` class lets a CSS class flip drive the visible label change with no re-render. That preserves a smooth height animation:

```css
.expand-wrap { display: grid; grid-template-rows: 0fr; transition: 320ms; }
.expand-wrap.is-expanded { grid-template-rows: 1fr; }
.expand-inner { overflow: hidden; min-height: 0; }
```

Chevron rotates 180° in sync; the inner content's natural height is the destination.

## Stacked events ("bursts")

When two or more major events land within a **stack window** (default 60s), they consolidate into a single row reading left-to-right as an action sequence:

```
8:43pm  ⏪  30s │ 🌙 15m │ 📖 Chapter 2     3% (0h13m)
```

- Lane shows the *first* action's icon only — never overlapping circles.
- Title: first action's parameter, then `[glyph] [param]` for each subsequent action, separated by a thin left-border rule.
- Stack window of `0` disables consolidation; users can opt-out.

Smart rewind + Resume is *not* in this mechanism — it's the tag-on-Resume special case described above. Same idea (compound action, one row), different implementation path because the Resume row is rendered specially.

## Selection

Tap any Resume or Pause row to mark it as the user's **jump-to candidate**:
- Left-edge green bar + subtle row tint + slight icon scale-up
- One selection at a time, persists through re-renders
- Internal key: `${sessionId}:resume` or `${sessionId}:pause`

The "preview this section / jump to it" UI hangs off this selection state. Not implemented in this iteration — visual marker only.

## Current-state anchor ("Now")

A distinct row at the very top of the timeline. Different visual treatment (subtle background, NOW pill colored to match the state):

- Icon: same vocabulary as event rows (▶ playing, ⏸ paused, `Zz` asleep)
- Right column: current book position in accent color
- Sub-text: `"since [time of last transition]"`

Derived from the most recent session: timer-fired → asleep; manual pause → paused; open session with no Pause yet → playing.

## Parked / future work

- **Book-progress view.** Reordering events by position-in-book raised unresolved questions: sleep-set vs sleep-fire would re-order across sessions; stacking semantics break when "co-occurring in time" no longer means "co-occurring in book"; the action sequence model assumes time-order. Stubbed in the UI as future work.
- **Drift visualization.** The "you fell asleep here vs where audio stopped" range was rendered as an indigo band but was confusing and visually overlapped neighboring rows. Dropped from render; data fields (`sleep.driftStart`, `sleep.driftEnd`) remain available.
- **Period bullet rollup** for older history (the "Earlier · 2+ weeks ago" tappable summary). Mechanism is in place but inactive — only renders when `olderSessions` is non-empty.

## What's deliberately *not* configurable

The granular controls in the playground (density, sleep-treatment, smart-rewind mode, stack window, etc.) are *exploration knobs* — they exist so we could try alternatives. The implementer should pick the defaults we settled on and ship those, not expose them all as user-facing settings. Settled defaults:

- Density: cozy
- Sleep treatment: shade
- Smart rewind on resume: inline tag (`[↶ 30s]`)
- Speed change: subtle
- Chapter jump: subtle
- Stack window: 1 minute
- Latest session: auto-expand on load
- Subtle day banding: on

## Implementation pointers

- **One vertical line, dots on top.** The line is a single `::before` on the timeline container; dots are icon circles centered on it. Don't draw per-row connectors.
- **Position via timestamp interpolation.** `eventBookPos(session, event) = pStart + (pEnd - pStart) × ((event.at - session.start) / (session.end - session.start))`. Single function, no index gymnastics, works for synthesized events.
- **Two playback transitions.** Resume + Pause are the only state changes in the model. Everything else (smart rewind, sleep-timer-set, sleep-timer-fire) annotates one of those two.
- **Synthesize Resume/Pause at render time.** They're derived from `session.start` / `session.end`. The persisted event list only contains the in-session events.
