# Scholaria interface

The student home screen prioritizes assigned work and a useful next action. It uses existing quiz, attempt, resource, and announcement records; it does not create academic records or alter scoring.

## Design system

`css/product-ui.css` defines semantic color tokens, Inter typography (12 / 14 / 16 / 20 / 24 / 32), spacing (4 / 8 / 12 / 16 / 24 / 32 / 48), 44px control targets, borders, radii, focus states, and reduced-motion behavior. It loads after the legacy theme and responsive styles. Shared `ui-button`, `ui-panel`, `ui-task`, `ui-status`, `ui-empty`, and `ui-progress` components are rendered by `js/core/learning-ui.js`.

Primary reading content is 16px. Metadata is 14px; compact status labels are 12px. Status always has a text label. Wide records scroll within their containers; mobile progress records retain labeled fields.

## Dashboard order

1. A compact greeting and four familiar summary cards: Enrolled Subjects, Available Quizzes, Latest Score, and Unread News.
2. A compact reminder for the earliest outstanding deadline, when one is recorded.
3. The full subject-card carousel, restored prominently above the detailed activity panels.
4. Pending quiz actions, the last opened/available resource, and relevant announcements. Missing deadlines say “No deadline set.”

The dashboard does not infer an unread-message count from data the chat backend has not supplied. There is no fabricated schedule, grade, streak, or lesson-progress percentage.

## Coverage and preserved operations

The shared styles cover student, teacher, and admin navigation; dashboards; subject outlines and uploads; standard quizzes and interactive quiz typography; quiz creation; progress and class records; approvals; announcements; messages; profiles; login; and password setup. Existing assessment types, timing, scoring, power-ups, role permissions, authentication, and database endpoints remain in place. No standalone assignment, settings, weekly-goal, or achievements page was invented where one did not exist.

Display integrity changes:

- Demo notifications, announcements, and materials are limited to demo profiles. Empty lists stay empty. Stored user records are not cleared.
- Course catalog entries are labeled as curriculum outlines, not completed lessons or actual PDF previews. Outlines download as valid text files.
- Teacher resources use the existing authenticated download endpoint. A returned HTTP(S) URL opens the original file; unavailable files produce an error instead of a simulated PDF.
- Only explicitly associated lesson metadata creates a linked assessment; unrelated quizzes are not linked by array position.

## Validation

- `node tests/ui-data.test.cjs`: missing/invalid dates, real completion counts, empty dashboards, priority order, account-scoped resource history, closed actions, escaping, demo isolation, and cleared lists.
- `node tests/ui-smoke.cjs`: isolated browser fixtures across all role pages at 1440, 768, 390, and 320px; resource reopening; subject outlines; keyboard accordion activation; quiz submission/scoring and feedback; message rendering; admin dialogs; quiz-maker steps; public pages and login forms. External requests are blocked and database writes are mocked. Set `PLAYWRIGHT_MODULE` and `EDGE_PATH` for another development environment.
- Browser previews cannot verify production authentication, file availability, message delivery, or database persistence. Those require a configured test deployment and authorized test accounts.

## Backend follow-ups

Persist per-student lesson completion, last lesson/page position, and last-opened timestamps to support cross-device Continue Learning and actual lesson progress. Weekly goals and durable achievement awards need explicit records and rules. Reliable unread-message totals require read receipts. Live schedules and assignments should be added only when those data models exist. The existing static course catalog needs an authoritative enrollment/catalog source if schools want to manage it from the server.

The current local resource history is keyed by account ID, stores only a resource ID and opening timestamp, and is described as device-local in the UI.

## Commit October 23
