# CivicSeva System Flow Documentation

## 1. Issue Reporting & Classification
- **Citizen** reports an issue (Image, Desc, Location).
- **System** captures GPS and User ID.
- **AI Module** (Gemini) classifies issue -> Department & Severity.
- **System** assigns `Community Deadline`:
  - High Severity: 6 Hours
  - Medium Severity: 1 Day
  - Low Severity: 3 Days
- **Status**: `OPEN`.

## 2. Community Participation Phase
- **Upvotes**: Increase priority/validity.
- **Downvotes**: 
  - If > 3 and > Upvotes, issue is flagged for **Fake Review**.
  - **Admin** reviews flagged issue:
    - Confirms Fake: Issue CLOSED, User Penalized (-10 pts).
    - Dismisses: Issue REOPENED.

## 3. Resolution Pathways

### A. Volunteer Resolution (Preferred)
- **Citizen** requests to solve issue (Submit `SolveRequest`).
- **Admin** approves request.
  - Issue Status: `ASSIGNED`.
  - Volunteer has **24 Hours** to resolve.
- **Volunteer** submits proof:
  - Issue Status: `PENDING_APPROVAL`.
- **Reporter** reviews proof:
  - **Approves**: Status `RESOLVED`. Volunteer gets points (+5/10/20).
  - **Rejects**: Status `REOPENED`. Issue goes back to pool.

### B. Volunteer Timeout / Failure
- If Volunteer fails to submit within 24 hours:
  - **System Task** runs (`process_issue_tasks`).
  - Volunteer Penalized (-20 pts).
  - Issue unassigned (Status `OPEN`) for Department/others.

### C. Department Resolution (Fallback)
- If `Community Deadline` passes with no resolution:
  - Issue remains visible to Department Officers.
- **Department Officer** resolves issue:
  - Uploads proof.
  - Status `RESOLVED`.

## 4. Background Tasks
- A management command `python manage.py process_issue_tasks` must be run periodically (e.g., hourly).
- It checks for:
  - Expired Community Deadlines.
  - Expired Volunteer Assignments.

## 5. Gamification
- **Reporting**: +5 pts.
- **Solving**: +5 (Low), +10 (Med), +20 (High) pts.
- **Fake Report**: -10 pts.
- **Failed Resolution**: -20 pts.
