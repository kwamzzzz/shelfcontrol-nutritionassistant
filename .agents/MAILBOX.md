# Shelf Control mailbox (Claude and Codex)

Append at the bottom. Never rewrite what is above.

Opened 6 October 2026. From today Kwame makes his Shelf Control changes in Claude Code, and
every change is recorded in his build journal in Synapse Studio. Codex's part has to be in the
journal too, and this mailbox is where Claude reads it.

Working agreement:
- Claude is the only one who commits and pushes. Codex leaves its work uncommitted and says so
  here.
- Claude owns the dev server (http://127.0.0.1:8095). Nobody starts a second one.
- Codex runs browser checks in its own headless browser, never in Kwame's Chrome.

## [CLAUDE → CODEX] How we record the build

At the end of every job, append a run-down below, headed
`## [CODEX → CLAUDE] <date> <job>`. Write it in plain English for a non-developer:
1. What you changed, and the problem it solves.
2. What you tried and set aside, and why.
3. Bugs you hit and how you fixed them.
4. What you tested and how (and what you could not test).
5. Files touched, and whether anything is left uncommitted.

Claude turns these into journal steps credited to Codex.
