# Baltazar Studio Client Chat Edit MVP

Working source file for the first version of an In Full Flight client-facing AI website request flow.

This document defines the MVP where an In Full Flight client uses chat to request website edits, receives a preview link for the proposed change, and moves through approval with clear scope boundaries. It is not a generic CMS editor plan. It is a guided chat-to-edit workflow with preview links as the review layer.

## In Full Flight Context

This MVP belongs to the In Full Flight stage, not the Cocoon or WIAW build stages.

That means this system is primarily for:

- post-launch website updates
- ongoing content edits
- maintenance requests
- light optimization requests
- support continuity after handoff or launch

It is not primarily for:

- first-build production workflow
- large strategy resets
- major redesign rounds
- replacing the internal WIAW build dashboard

The product should feel like an ongoing support workspace where the client can message Baltazar Studio to request changes, then review a preview before anything goes live.

## Product Goal

Create a client experience where:

1. The client types a website request in chat.
2. AI decides whether the request is allowed, in scope, contradictory, or a new revision round.
3. If allowed, the system creates a staged website change.
4. The client receives a preview link.
5. The client approves, revises, or is pushed into a new request round.
6. The studio or system publishes only after approval.

This should feel like an AI website concierge that turns chat requests into website edits, not a raw editor and not a support inbox.

## Terminology

This product should be described internally as a `chat-to-edit` system.

That means:

- the client makes edit requests in chat
- AI interprets the request into structured website changes
- the system generates a preview of the edit
- the preview is the review artifact, not the product itself

In other words, the chat is the editing interface. The preview link is the output for review and approval.

## Core Product Shape

The MVP is a chat-driven website editing system with preview generation, approval gates, and policy-aware pushback.

Within In Full Flight, it should act like a managed post-launch support channel, not an open-ended redesign engine.

The client should not:

- edit arbitrary code
- browse internal dashboard operations
- directly manipulate layout settings across the whole app
- publish without approval logic

The client should be able to:

- request copy changes
- request image swaps
- request approved section additions or removals
- request section reordering
- request light styling changes within allowed brand limits
- use chat as the only editing interface
- receive a preview link for each accepted request
- approve or reject the preview

## What MVP v1 Should Do

### In Scope

- Client authentication and workspace access
- One chat thread per website workspace
- One active In Full Flight request stream per website workspace
- AI request intake
- AI classification: allowed, needs clarification, out of scope, new round
- Preview generation for accepted requests
- Preview link delivery inside the client workspace
- Approval and revision decision states
- Request history with status timeline
- Locking behavior after approval
- Human override for studio admins

### Out Of Scope For v1

- Freeform AI code editing across the whole repo
- Full design system regeneration on demand
- Automatic production publish without review controls
- Open-ended CSS generation from vague prompts
- Multi-page redesign from a single chat message without guardrails
- Direct client access to internal admin task architecture
- Replacing the internal WIAW delivery workflow

## Recommended MVP Philosophy

Start with a safe website model, not raw code generation.

For In Full Flight, prioritize high-frequency, low-risk edits first.

The AI should primarily edit:

- page copy fields
- image references
- CTA labels and URLs
- testimonial items
- FAQ items
- section order
- approved section variants
- theme tokens such as color, spacing tier, or button style tier

These are the kinds of requests that fit an ongoing support or maintenance relationship well.

The AI should not start by editing arbitrary JSX, CSS, or route logic for every request. That path is possible later, but it is not the stable MVP.

The AI should also push larger strategic or structural requests into a separate studio review path instead of treating them like routine support updates.

## Best-Fit Stack

Use the current app as the control layer and extend it with a client-facing chat editing surface.

### Frontend

- Next.js App Router
- React
- Existing Baltazar Studio dashboard codebase
- New In Full Flight client-facing route inside this app, not a separate product yet

### Backend

- Supabase Auth for client login and role separation
- Supabase Postgres for requests, approvals, snapshots, and content state
- Supabase Storage for client-uploaded files and staged media
- Next.js Route Handlers or Server Actions for orchestration

### AI Layer

- LLM provider for classification, action planning, and response writing
- Structured output schema for allowed actions
- Policy layer that decides whether the request should be accepted, clarified, deferred, or rejected

### Preview Layer

- Preferred MVP: same app renders preview snapshots from staged website data
- Optional later layer: GitHub branch plus Vercel preview deployment for code-backed changes

### Deployment

- Vercel for app hosting and preview environments
- GitHub for source control, branch history, and optional repo-backed preview generation

## Is A GitHub Repo Enough?

A GitHub repo is enough for a strong prototype if the flow is:

1. AI writes a structured or code-based change.
2. A branch or snapshot is created.
3. Vercel generates a preview deployment.
4. The client reviews the preview.

But GitHub alone is not enough for the full product. It does not give us:

- client auth
- request threads
- scope rules
- approval locks
- revision counting
- asset workflow
- friendly client chat UX

For this MVP, GitHub should be treated as infrastructure, not as the product itself.

## Two Valid MVP Paths

### Path A: Structured Content MVP

This is the recommended first version.

The website is rendered from database-backed content and approved section blocks. Client requests update structured content. The preview link points to a staged snapshot in the same app or a preview deployment generated from that snapshot.

Pros:

- safer
- easier to review
- faster to ship
- easier rollback
- fewer broken previews

Cons:

- less flexible for unusual requests
- requires content modeling up front

### Path B: Repo-Driven AI Edits

The client request becomes an AI-generated code or JSON change in GitHub. Vercel then generates a preview from that branch.

Pros:

- more flexible
- closer to arbitrary website changes
- useful for advanced internal workflows

Cons:

- more brittle
- harder to constrain
- higher QA cost
- greater chance of broken UI

### Recommendation

Start with Path A for client-facing requests.

Keep Path B as an admin-only escalation path for requests that exceed the structured content model.

## User Journey

### Client Flow

1. Client signs in to an In Full Flight workspace.
2. Client opens a chat thread tied to one website project.
3. Client types a request such as:
   - Change the hero headline to something warmer.
   - Replace the founder image with this new photo.
   - Add a testimonials section before the final CTA.
   - Update the announcement banner with this week's offer.
4. AI evaluates the request against the workspace policy.
5. The system responds with one of four outcomes:
   - accepted and generating preview
   - needs clarification
   - out of scope
   - new revision round required
6. If accepted, the system creates a staged change set.
7. The client receives a preview link and summary of what changed.
8. The client chooses:
   - approve
   - request revision
   - defer
9. Approved changes become publishable.
10. Published changes become part of the active website state.

### Studio Flow

1. Studio creates a client workspace and assigns website model access.
2. Studio defines allowed section types, brand rules, and revision policy.
3. Studio can review requests that hit pushback or uncertainty thresholds.
4. Studio can publish approved changes or allow auto-publish for low-risk content-only requests later.
5. Studio keeps larger redesign or repositioning requests out of the routine In Full Flight queue unless deliberately approved.

## AI Behavior Rules

The AI should not behave like a yes-to-everything assistant.

It should evaluate each request against:

- current project stage
- whether the workspace is in active In Full Flight support
- approval status
- brand direction
- allowed edit types
- revision count
- contradiction with previously approved decisions
- whether the request is a refinement or a new direction

### Allowed AI Outcomes

- `accepted`
- `needs_clarification`
- `out_of_scope`
- `new_revision_round`
- `locked_requires_studio_review`

### Pushback Examples

- This page is already approved, so I can log this as a new post-approval request instead of changing the current approved version.
- Changing the full visual direction from minimal to playful counts as a broader revision round rather than a small tweak.
- I can update the headline and CTA here, but moving the whole site into a different structure needs studio review first.
- I can handle this as an In Full Flight update, but a full homepage redesign would need to move into a separate studio scope.

## Request Policy Model

Each website workspace should have policy settings such as:

- max revision rounds per stage
- max requests per active round
- allowed section library
- allowed token changes
- whether copy-only requests can auto-preview
- whether publish requires studio approval
- whether approved pages lock immediately

This is what makes the AI consistent instead of improvising policy on every message.

## Recommended Data Model

These are the main tables or entities for MVP planning.

### Identity And Access

- `profiles`
- `organizations`
- `workspace_members`
- `workspaces`

### Website Structure

- `websites`
- `website_pages`
- `page_sections`
- `section_variants`
- `content_nodes`
- `theme_tokens`

### Chat And Requests

- `chat_threads`
- `chat_messages`
- `change_requests`
- `change_request_actions`
- `request_policy_snapshots`

### Preview And Approval

- `website_snapshots`
- `preview_builds`
- `approval_gates`
- `approval_decisions`
- `publish_events`

### Files

- `media_assets`
- `asset_versions`

## Suggested Request Object

Each accepted request should resolve into a structured payload, such as:

```json
{
  "requestType": "content_update",
  "targetPage": "home",
  "actions": [
    {
      "action": "update_text",
      "target": "home.hero.headline",
      "value": "A warmer headline goes here"
    },
    {
      "action": "replace_image",
      "target": "home.hero.image",
      "assetId": "asset_123"
    }
  ],
  "policyDecision": "accepted",
  "reasoningSummary": "Requested changes stay within the approved homepage scope and do not alter the locked visual direction."
}
```

The model can generate the plan, but the system should validate it before any snapshot is created.

## Preview Strategies

### Strategy 1: Snapshot Preview In The Same App

Recommended first.

The live site renders from published content. The preview route renders from a staged snapshot.

Example:

- live: `/site/[siteSlug]`
- preview: `/preview/[workspaceId]/[snapshotId]`

Pros:

- fast
- cheap
- easy rollback
- no branch noise

### Strategy 2: Branch Preview Deployment

Use when the request needs code or template changes that the content model cannot express.

Flow:

1. AI or admin creates a branch.
2. Change is committed.
3. Vercel generates a deployment preview.
4. Preview URL is attached to the request record.

Pros:

- supports more advanced changes

Cons:

- slower
- more operational complexity
- higher failure rate

## Recommended Route Structure In This App

- `/login`
- `/dashboard`
- `/in-full-flight/[workspaceSlug]`
- `/in-full-flight/[workspaceSlug]/chat`
- `/in-full-flight/[workspaceSlug]/requests/[requestId]`
- `/preview/[workspaceSlug]/[snapshotId]`
- `/admin/requests`
- `/admin/websites/[websiteId]`

The current internal dashboard stays internal. The In Full Flight client route should be simpler, narrower, and more guided.

## State Machine

### Change Request Status

- `submitted`
- `classified`
- `clarification_needed`
- `accepted`
- `preview_generating`
- `preview_ready`
- `awaiting_client_decision`
- `approved`
- `revision_requested`
- `rejected`
- `locked`
- `published`

### Approval Logic

- `draft`
- `sent_for_review`
- `approved`
- `changes_requested`
- `expired`

### Locking Logic

After approval:

- the approved snapshot becomes the latest approved version
- the request is marked closed
- new changes open a new request round
- major contradictory changes can require studio review before preview

## MVP Screens

### 1. Client Chat Workspace

Must include:

- conversation thread
- current website/stage label
- latest preview card
- request status
- clear next action

### 2. Preview Review Screen

Must include:

- preview link or embedded preview
- concise change summary
- approve button
- request revision button
- policy notice when the page is locked or the request starts a new round

### 3. Admin Review Queue

Must include:

- requests needing human review
- out-of-scope requests
- contradictory or risky requests
- publish-ready approvals

## Technical Build Order

### Phase 0: Foundation

- Add client roles and workspace auth with Supabase
- Define website content schema
- Define request and snapshot tables
- Build one previewable page model, ideally homepage only

### Phase 1: MVP Flow

- Build client chat UI
- Add AI classification endpoint
- Add structured action validation
- Create snapshot preview route
- Add approve and revision actions
- Store request history

### Phase 2: Policy And Guardrails

- Add revision counting
- Add locked-after-approval rules
- Add new-round detection
- Add studio escalation queue

### Phase 3: Advanced Preview

- Add branch-backed previews for non-modeled requests
- Add publish workflow
- Add audit trail and rollback UI

## Suggested MVP Stack For Baltazar Studio

### Use Now

- Next.js App Router in this repo
- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Vercel
- GitHub
- LLM provider with structured outputs

### Add Soon After

- background jobs for preview generation
- observability for failed preview runs
- image transformation pipeline if client uploads become heavy

## Minimum Success Criteria

The MVP is successful if:

1. A client can log in and submit a request in chat.
2. The AI can classify the request and either accept it or push back with a consistent reason.
3. Accepted requests create a previewable snapshot.
4. The client can approve or request revision from the preview screen.
5. Approved work can be published or queued for publish.
6. The system prevents endless post-approval drift by opening a new round when needed.

## Biggest Risk Areas

- trying to support arbitrary redesign requests too early
- letting the model edit raw code before the content model is stable
- weak scope policy causing endless revisions
- no approval lock after preview
- trying to expose the full internal dashboard to clients

## Final Recommendation

For Baltazar Studio, the strongest MVP is:

- same app
- separate In Full Flight client-facing chat workspace
- structured website model
- snapshot preview links
- approval and revision policy
- studio review for edge cases

That gets far enough to prove the product without overcommitting to brittle AI code edits on day one.
