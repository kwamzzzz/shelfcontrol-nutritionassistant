# Shelf Control: standing instructions for agents (Codex reads this file)

Kwame records the build of this app in his journal in Synapse Studio
(`~/synapse-studio/src/data/journal/shelf-control.json`). Claude writes and commits the journal
chapters. See CLAUDE.md for the full journaling and screenshot steps.

## Codex
- Work orders and run-downs go in `.agents/MAILBOX.md`. Append at the bottom; never rewrite what
  is above.
- Claude is the only one who commits and pushes. Leave your work uncommitted and say so in the
  mailbox.
- Claude owns the dev server (`http://127.0.0.1:8095`). Don't start a second one. Run any
  browser checks in your own headless browser, never in Kwame's Chrome.
- Finish every job with a run-down in the mailbox, written for the journal in plain English:
  what you changed and why, what you tried and set aside, any bugs and how they were fixed,
  what you tested, and the files touched.
