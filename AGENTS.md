# Project Instructions — Pickleball Club Booking System

## 1. Mandatory Project Blueprint

The master specification for this project is:

`PRODUCT_BLUEPRINT.md`

Before planning, modifying, or implementing any feature, read the blueprint and follow it as the primary project specification.

If the blueprint is missing, unreadable, or ambiguous about a required implementation detail, stop and ask for clarification instead of inventing requirements.

Do not silently replace the blueprint with your own architecture, feature list, or development sequence.

## 2. Development Workflow

Work in explicitly approved phases.

- Do not implement any phase until the user explicitly authorizes it.
- Do not automatically proceed to the next phase when the current phase is completed.
- Do not implement multiple phases at once unless the user explicitly approves that scope.
- Before implementing an approved phase, review its requirements, dependencies, acceptance criteria, and relevant existing code.
- Explain the proposed implementation approach before making substantial changes.
- After completing a phase, report what was implemented, files changed, checks performed, known limitations, and any remaining tasks.
- Wait for the user's approval before proceeding to another phase.

When the user requests a phase, interpret the request according to the blueprint's phase numbering and scope. If the requested scope is unclear, ask before making changes.

## 3. Initial Review — No Code Changes

When first instructed to review the project:

1. Read the complete v2.5 blueprint.
2. Inspect the existing repository structure and relevant source files.
3. Review the existing framework, dependencies, routing, database setup, authentication, environment configuration, and current features where applicable.
4. Identify which requirements already exist, which are partially implemented, and which are missing.
5. Check the blueprint's phase dependencies and identify relevant risks or blockers.
6. Summarize the findings and recommend the next appropriate step.

During this initial review, do not create, edit, delete, move, or install anything. Do not run database migrations or change environment configuration.

The user must explicitly authorize implementation separately.

## 4. Protect Existing Work

This is an existing project unless the user explicitly says otherwise.

- Inspect before editing.
- Reuse existing components, utilities, patterns, and dependencies when appropriate.
- Do not rebuild working features without a clear requirement.
- Avoid unnecessary refactoring, dependency upgrades, file renaming, and architecture changes.
- Do not delete existing files or overwrite user work without explicit approval.
- Do not expose secrets, API keys, credentials, or environment variable values in logs, responses, or committed files.
- Never commit secrets to source control.

## 5. Scope Control: MVP First

The v2.5 blueprint takes priority over speculative feature development.

Coaching functionality and DUPR integration are deferred, conditional features. They are not assumed to be part of the initial MVP.

- Do not implement coaching features unless the user explicitly authorizes the relevant conditional phase.
- Do not implement DUPR integration unless the user explicitly authorizes the relevant conditional phase.
- Do not create speculative coaching or DUPR pages, database tables, API endpoints, integrations, or workflows ahead of approval.
- Do not treat these features as prerequisites for the core booking system unless the blueprint explicitly requires it.
- If the client has not confirmed a conditional feature, leave it deferred and document the dependency where relevant.

Prioritize the approved core booking requirements and their dependencies.

## 6. Follow the Existing Technical Architecture

Inspect the repository before making technical decisions.

- Use the project's existing framework and conventions unless the blueprint or user explicitly approves a change.
- Do not assume a database, payment provider, authentication system, or external API is configured just because it is mentioned in the blueprint.
- Verify the actual configuration and distinguish implemented functionality from planned functionality.
- Do not hardcode credentials, payment secrets, or service-role keys into client-side code.
- Use secure server-side handling for privileged operations and payment verification where applicable.
- Do not claim an integration works unless it has been implemented and appropriately tested.

If an essential technical decision is missing, explain the options and ask for approval when the choice materially affects the architecture, cost, security, or scope.

## 7. Implementation and Testing

For each approved phase:

1. Identify the exact requirements in the blueprint.
2. Check dependencies and existing implementations.
3. Make the smallest coherent set of changes that satisfies the approved scope.
4. Follow existing code style and project conventions.
5. Validate the changes using relevant available checks, such as linting, type checking, tests, builds, or manual verification.
6. Fix regressions caused by your changes.
7. Report checks that passed, failed, or could not be run.

Never claim tests passed if they were not executed.

Do not expand the phase into unrelated features.

## 8. Handling Ambiguity

If a requirement is unclear, contradictory, technically infeasible, or dependent on client confirmation:

- Identify the exact uncertainty.
- Explain why it matters.
- Ask a concise clarification question before making consequential assumptions.
- Do not invent business rules or silently change the blueprint.

For minor implementation details that do not change the required behavior, use a reasonable solution consistent with the existing project and document the decision.

## 9. Phase Completion Report

At the end of each approved phase, provide:

- Phase completed and its intended scope.
- Features implemented.
- Important files created or modified.
- Tests and validation performed, including results.
- Known limitations or unresolved issues.
- Any manual configuration or external service setup still required.
- Recommended next phase, without starting it.

## 10. Authority and Approval

Follow this order of authority:

1. Explicit instructions from the user in the current task.
2. The v2.5 blueprint for project requirements and phase sequencing.
3. This AGENTS.md for development workflow and safety rules.
4. Existing project conventions for implementation details.

If the user explicitly changes an earlier requirement, clarify and document the change when needed. Do not assume that a casual discussion or suggestion authorizes implementation.

**Default behavior: inspect, explain, and wait. Implement only the scope the user explicitly approves.**