# Shelf Control: standing instructions for Claude Code

From 6 October 2026 Kwame makes his Shelf Control changes in Claude Code, not in Lovable.
Every change gets recorded in his build journal as part of the same piece of work.

## Journal every change
After anything ships, is scrapped or is parked, use the `build-journal` skill (its "Adding a
chapter after shipping" and "Captures" sections) to add or extend the chapter in
`~/synapse-studio/src/data/journal/shelf-control.json`:
- His prompt: polished in `text`, his exact words in `raw`.
- What Claude (or Codex) did, bugs with their fixes, ideas set aside and why.
- A `shipped` step with `detail.plain`, `builtWith`, `undo` and `refs` (commit hashes, PR numbers).
- A story paragraph if it is a milestone.

## Screenshots, before and after
- Run the app on `127.0.0.1:8095` (`npx vite --host 127.0.0.1 --port 8095`). Kwame is signed in on
  that address. Port 8080 is taken on his Mac.
- Take a **before** capture of a screen before changing it, and an **after** capture once it works,
  in a 1600x1000 window from the same scroll position, so the two pair on the journal's slider.
- The logo is stored on Lovable (`/__l5e/...`), so it is broken locally. Point those images at
  `https://shelfcontrol-nutritionassistant.lovable.app` before capturing.
- Save to `~/synapse-studio/public/journal/shelf-control/` as `NN-what-YYYY-MM-DD.jpg`. Pin them
  to the step they followed (`steps[].images`), and give same-screen captures the same `view`.
- Never capture keys, emails or other people's data.

## Finishing
- Validate the journal (no em-dashes, every `buildsOn` has a `buildsOnWhy`), then commit it in
  `~/synapse-studio` with explicit paths only.
- Ask Kwame before pushing Synapse Studio. After a push, deploy it on Lovable and check the live site.
