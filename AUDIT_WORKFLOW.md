# Cocoon Consult Audit Workflow

Source: `/Users/trishabltzr/Downloads/The Audit Checklist.pdf`
Dashboard route: `http://localhost:3412/dashboard`

## Purpose

The audit turns a client intake and website review into a structured, editable dashboard checklist. Every audit should use the same category and subcategory system from the PDF checklist so results are comparable across clients and do not create one-off group names.

## Canonical Categories

Use these six top-level audit categories:

1. Content
2. Design & Typography
3. Navigation & Structure
4. Accessibility & Compliance
5. Mobile Responsiveness
6. Search Engine Optimization (SEO)

## Canonical Subcategories

Only use subcategories that exist in the PDF checklist.

Design & Typography:

- Forms & Text Fields
- Inputs & Buttons
- Type
- Visual Design
- Iconography, Images, & Illustration
- System

Accessibility & Compliance:

- General
- Errors & Alerts
- Permissions
- Form & Fields
- Data
- Help & Support

Search Engine Optimization (SEO):

- Indexing
- SEO Performance
- Accessibility
- Navigation
- SEO Tools

Content, Navigation & Structure, and Mobile Responsiveness currently remain flat unless the PDF checklist is updated with formal subcategories.

## Audit Flow

1. Intake
   - Client completes the Cocoon Consult intake.
   - Intake captures business context, website URL, goals, audience, current materials, access notes, and known concerns.

2. Website review
   - The website is reviewed against the PDF checklist categories.
   - Each checklist item receives a status: passed/completed, in progress, failed/needs attention, blocked, or not started.
   - Notes should explain what was observed, why it matters, and what action is recommended.

3. First OpenAI review pass
   - Run the website and intake findings through the first OpenAI review pass.
   - This pass checks the site against the canonical checklist and produces findings, risks, and recommended fixes.

4. Second OpenAI review pass
   - Run a second independent OpenAI review pass against the same inputs.
   - This pass cross-checks the first pass, catches missed issues, and flags disagreements or uncertain findings.

5. Human review
   - Review both model outputs.
   - Resolve conflicts, remove weak findings, and make sure the final audit is clear, useful, and aligned with the Cocoon Consult offer.

6. Dashboard organization
   - Passed/completed items move into the completed checks group.
   - Failed, incomplete, blocked, or needs-attention items stay visible under their canonical category or subcategory.
   - Long lists use PDF subcategory branches only when the category has canonical subcategories.
   - Do not create custom per-client subcategory names.

7. Client delivery
   - The client sees the audit preview, completed checks, and remaining items in the dashboard.
   - The dashboard remains editable so the client can hand it to an agency or use it to manage the DIY path.
   - Cocoon Consult Premium can add guided review, call booking, and a project-ready handoff.

## Dashboard Rules

- The dashboard must read subcategory labels from the canonical audit taxonomy, not from view-specific hardcoded labels.
- Completed items should be collapsed by default under completed checks.
- Incomplete items should remain visible and actionable.
- Branch connector lines should appear only for grouped subcategory lists or expanded completed lists where they improve readability.
- The same phase detail modal template should be used across client, paid Cocoon, In Full Flight, and admin views.
