<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Ficcado Frontend Migration Directive
When migrating the application from HTML (`beforeMigration/`) to Next.js 16 (`frontend/ficcado-website-frontend/`):
- **Canonical Blueprint**: Refer to [MIGRATION_ARCHITECTURE_SPEC.md](file:///e:/fic-website-repo/Ficcado-website/docs/MIGRATION_ARCHITECTURE_SPEC.md) for the complete list of 11 views, 11 modals, route transitions, and component contracts.
- **Scope**: Focus exclusively on frontend Next.js pages and components. Keep the Spring Boot backend (`backend/ficcado-website-backend`) untouched for this phase.
- **Assets**: Production images are available under `/public/images/`.
- **Styling**: Use Tailwind CSS v4 and the brand design tokens (`#2B62C6`, `#B4D1EF`) specified in the architecture document.
