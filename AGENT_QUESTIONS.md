# AGENT_QUESTIONS.md

This document tracks questions, architectural considerations, and assumptions requiring confirmation as mandated by `docs/Ficcadocompleterebuild.md`.

---

## Open Questions

### Q-001: Brand Check Script & Requirement Document Allowlist
- **Context:**
  `website/scripts/check-brand.mjs` scans `['src', 'public', '../docs']` for forbidden brand misspellings. It flags two occurrences in `docs/Ficcadocompleterebuild.md` where the forbidden spelling was cited explicitly in the prompt instructions:
  - Line 3: `Never write "Ficado" in code...`
  - Line 298: `- [ ] Zero occurrences of "Ficado" anywhere`
- **Options:**
  1. **Option A (Recommended):** Add `../docs/Ficcadocompleterebuild.md` to `ALLOWED_FILES` in `website/scripts/check-brand.mjs`. This matches how other specification/brief documents (`../docs/briefs/AGENT_BRIEF.md`, `../docs/memory.md`, etc.) are already handled in `ALLOWED_FILES`.
  2. **Option B:** Rephrase the prompt document `docs/Ficcadocompleterebuild.md` so it does not contain the literal word (e.g., referring to "single-C misspelling").
- **Recommended Default:** Option A (add `../docs/Ficcadocompleterebuild.md` to `ALLOWED_FILES` in `check-brand.mjs` while ensuring all other code, comments, configs, and UI files have zero occurrences).

---

### Q-002: Root-level `.gitignore`
- **Context:**
  Neither `origin/fic/crm` nor `origin/fic/website` contained a root-level `.gitignore` file (only project subdirectories like `website/`, `crm/ficcado_crm_app/`, and `crm/backend/ficcado_crm_backend/` had local `.gitignore` files).
- **Options:**
  1. **Option A (Recommended):** Add a lightweight root-level `.gitignore` covering OS/editor files (`.DS_Store`, `Thumbs.db`, `.vscode/`, `.idea/`) without interfering with subprojects.
  2. **Option B:** Rely strictly on per-project `.gitignore` files in each service directory.
- **Recommended Default:** Option A.

---

### Q-003: Website Import Directory Structure
- **Context:**
  The website code on `fic/website` was located under `frontend/ficcado-website-frontend`. In `docs/Ficcadocompleterebuild.md`, the target layout specifies `website/` (imported from `fic/website`).
- **Options:**
  1. **Option A (Adopted):** Placed the Next.js website files directly under `website/` (`website/package.json`, `website/src`, etc.) matching the structure of `crm/ficcado_crm_app/`.
  2. **Option B:** Retain the nested `website/ficcado-website-frontend/` directory.
- **Recommended Default:** Option A keeps a clean root layout consistent with `crm/`, `ficcado_website_data/`, `gateway/`, etc.

---

## Resolved Questions / Decisions Log
*(None yet)*
