---
name: draw-me-a-picture
description: "User-invoked only. Explain where we've got to as a picture instead of more text."
disable-model-invocation: true
argument-hint: "(optional) what the picture should explain"
---

The last few messages carried something the user would rather see than read. Turn it into one visual page.

You run **inline, in the main conversation** — you can see it. The subagent you hand the drawing to cannot see any of it: its entire world is the brief you write. That blindness is the point. The brief is forced compression, and compression is what pins the picture to one idea instead of the whole transcript.

So: never paste the transcript into the brief, and never draw the picture yourself unless step 5's fallback applies.

## 1. Find the subject

Name the one thing the picture must land. Usually the live tension: a decision not yet made, a mismatch between what something is and how it's being used, a mechanism that keeps biting.

Argument given → that's the subject. No argument → the thing the user has circled back to most.

Nothing in the conversation worth drawing? Say so in one line and ask what to draw. Never invent a subject.

Leave out everything that isn't in service of the subject. A picture of the whole conversation lands nothing.

## 2. Pick the shape

One **shape** carries the subject, chosen to fit it:

| Subject                   | Shape                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| A choice between options  | **fork** — one origin, one lane per option, lanes differing at the single hop that matters |
| How something moves       | **flow** — boxes and arrows, the failure points marked where they occur                    |
| What something is made of | **anatomy** — one labelled thing, parts called out                                         |
| What a change does        | **before / after** — two panels, same framing, the delta obvious                           |
| Why something went wrong  | **timeline** — events on a line, the branch point marked                                   |

The shape becomes the **centrepiece**: the biggest element, the one thing understood first. Options compared get a tick/cross grid beneath it — rows are the things the user actually cares about, so the trade-off is read at a glance rather than counted up from prose.

## 3. Write the brief

The brief is the subagent's only input, so it has to stand alone: no "as discussed", no pointers back to the conversation, no file paths it would have to go and read. Write out:

- **The domain in plain terms** — what this system is and does. Assume zero knowledge.
- **The subject**, stated as the insight to convey, and the shape to carry it.
- **The concrete facts** each part of the picture rests on — real names, real numbers, real field names from the conversation. Specifics are what make it feel like their system rather than a stock diagram.
- **The catch for each option**, where options exist. A picture that flatters one path is worthless for deciding.
- **The recommendation**, if there is one, and that it should read as visually obvious.

## 4. Say what you're drawing

One line to the user before you delegate — the subject and the shape, nothing more. They asked for a picture instead of text; a paragraph of setup is the thing they were trying to escape.

## 5. Delegate the drawing

Delegate to one general-purpose subagent through whatever mechanism the current runtime provides, and wait for it in the foreground — the user is waiting on the link. It must start with no conversation history: on Codex, set `fork_turns` to `"none"`, since a full-history fork defeats the blindness above. The prompt is the brief from step 3, followed verbatim by:

> Build this as one self-contained visual page and publish it.
>
> - Load the `artifact-design` skill, then `artifact-diagramming`, before writing any file.
> - Inline SVG only — no external assets. Readable in both light and dark.
> - Pictures carry the meaning, text is labels. Every text block two lines or shorter. Whole page understood in under a minute.
> - One short noun-phrase title.
> - Write the page to your scratchpad directory, then publish it with the Artifact tool.
> - Build only on facts in this brief. You cannot see the conversation it came from, so a gap is better than an invented detail — if something you need is missing, leave that part out.
> - Return only the published URL and three short lines on what the picture shows.

**If this runtime can't delegate to a subagent**, do that same work yourself, in that order — `artifact-design`, then `artifact-diagramming`, then write the file, then publish it — held to the brief you just wrote and to every bullet above. Note in the relay, in one line, that it was drawn inline.

## 6. Relay

Return the published URL — or the file path, where publishing isn't available — and three lines on what the picture shows. Nothing beyond that, save the fallback's one line: the picture argues its own case, and restating it in prose undoes the point of asking.

Name the open decision in one closing line. The conversation picks it up from there.
