# Manual Test Checklist

## Core Rules

- Player submission total never exceeds 10.
  - Enter Quran=3, Hadith=3, Fiqh correct=2, Impact done=2 -> total is 10.
  - Try to force invalid values (negative or > allowed) using devtools -> database rejects.

- Fiqh scoring matches the answer key but player cannot see the key.
  - As player: open Day card, answer صح/خطأ, submit.
  - Ensure UI never shows "الإجابة الصحيحة".
  - Ensure reading `group_day_answer_keys` fails (RLS) for player.

- Cutoff locks editing for players (default 23:59 America/Chicago).
  - Change group cutoff to a time a few minutes ahead.
  - As player: submit before cutoff -> success.
  - After cutoff: attempt update -> database rejects update, UI shows error.
  - As supervisor: update still works after cutoff.

## Competition

- Daily leaderboard updates correctly.
  - Two players submit different totals; ordering matches totals.

- Overall leaderboard updates correctly.
  - Submit across multiple days; totals sum correctly.

- Streaks show consecutive submissions.
  - Submit day 1,2,3 -> streak 3.
  - Skip day 4 -> streak 0 on day 4 for that user.

## Supervisor

- Override works and is logged.
  - Pick a submission, set override total and reason.
  - Verify submission total changes.
  - Verify entry appears in "سجل التعديلات".

- Content editor saves.
  - Edit hadith/fiqh/impact text and correct answer.
  - As player: verify updated text appears; answer key remains hidden.

## Reports

- Export CSV downloads and includes expected columns and rows.
- Print view renders a clean table for 7 players.

