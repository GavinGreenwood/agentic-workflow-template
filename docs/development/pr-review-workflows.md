# Which PR review command do I run?

One decision: **am I finishing the one PR I'm sitting on, or clearing everything I've got open?**

```mermaid
flowchart TD
    A["PR is open — reviews incoming"] --> B{"How many of your PRs<br/>do you want to action right now?"}

    B -->|"Just this one<br/>(you're on its branch)"| C["/pr-action-review PR-NUMBER"]
    B -->|"All of mine,<br/>whatever branch I'm on"| D["/pr-action-review-mine-loop"]

    C --> C1["Checks out that PR's branch<br/>Actions its comments<br/>Merges when eligible<br/>Stops"]
    D --> D1["Finds every open PR you authored<br/>Checks out each branch in turn<br/>Actions + merges each<br/>Loops until nothing is left"]

    C1 --> E["Ticket moves to Done on merge"]
    D1 --> E
```

**Rule of thumb:** if you can name the PR number, use `pr-action-review`. The loop is a batch tool — it walks
_all_ your open PRs and will check out other branches to do it. Don't reach for it just because you happen to be
on a branch with one PR.

## The normal single-ticket flow

```mermaid
flowchart LR
    A["/capture 'I want to…'"] --> B["/pickup PROJ-XX"]
    B --> C["…build it…"]
    C --> D["/pr"]
    D --> E["/pr-action-review PR-NUMBER"]
    E --> F["merged + ticket Done"]
    F --> G["/wrap-up"]
```

`/pr --watch` collapses the last two steps: it opens the PR, waits for the first review to land, then runs
`pr-action-review` for you automatically. Same thing, one less command. Without `--watch`, `/pr` _offers_ to
watch and you say yes — the flag just skips the question.

## The batch flow

```mermaid
flowchart LR
    A["3 PRs open, reviews sitting on all of them"] --> B["/pr-action-review-mine-loop"]
    B --> C["each PR actioned + merged in turn"]
    C --> D["Jira transitions applied in one batch at the end"]
```

Use this when you've stacked up work and want it all landed — typically first thing in the morning, or after a
review sweep from the team.

## Corrections to the version doing the rounds

| Claim                               | Reality                                                                                                                                                                                         |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/wrap-up` "merges everything in"   | It does **not** merge anything. It switches to `main`, pulls, and deletes the finished feature branch. Merging happens in `pr-action-review` (or the loop). That's why the PR looked untouched. |
| Use the loop to watch one PR        | The loop isn't a watcher. For one PR use `/pr --watch`, or `/pr-action-review <number>` once a review is in.                                                                                    |
| `/pr-review-loop` is the same thing | Different command, opposite direction — it reviews **other people's** PRs. `pr-action-review*` acts on **yours**.                                                                               |

## Cheat sheet

| I want to…                                    | Command                         |
| --------------------------------------------- | ------------------------------- |
| Action reviews on one specific PR             | `/pr-action-review <pr-number>` |
| Open a PR and have it self-drive to merge     | `/pr --watch`                   |
| Land every open PR I own                      | `/pr-action-review-mine-loop`   |
| Review my teammates' PRs                      | `/pr-review-loop`               |
| Tidy up after a merge (branch + back to main) | `/wrap-up`                      |
