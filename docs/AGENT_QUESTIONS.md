# Agent Questions — Part 4 Website Refactor

This file tracks questions requiring developer decisions per Section 1 Rule R1/R2 and Section 6 of `Part4WEBSITE.md`.

---

### P4W-Q-001: Session Cookie Lifecycle vs. Persistent Expiry
- **Phase / issue**: P4W-2 / WEB-4
- **What I found (evidence, file:line)**:
  `CustomerSessionService.java:125` creates the `ficcado_customer_session` cookie as a session cookie (no `Max-Age` or `Expires` attribute set). In Part 3, this was chosen so that closing the entire browser terminates the session.
- **Why this file does not decide it**:
  `Part4WEBSITE.md` Section 2 states: "The login cookie stays a session cookie (no persistent expiry), as decided in Part 3. Closing the whole browser therefore ends the login. This is recorded as a question for the developer (P4W-Q), not changed."
- **Option A**: Keep session cookie without persistent expiry (closing the entire browser logs the customer out). Idle sliding timeout is 1 hour while the browser is open.
- **Option B**: Set persistent cookie `Max-Age=3600` that matches the server idle window so returning within 1 hour across browser restarts keeps the user signed in.
- **My recommendation (optional)**: Option A (maintain strict compliance with existing security rules as decided in Part 3).
- **Status**: RESOLVED (see docs/AGENT_ANSWERS.md)

---

### P4W-Q-002: Scope of Database Reset for Customer Accounts in `ficcado_data`
- **Phase / issue**: P4W-1 / WEB-8
- **What I found (evidence, file:line)**:
  The developer instruction was "Remove the old DB and start a new." The safe reading in `Part4WEBSITE.md` Section 4 resets only Docker Compose volumes (`ficcado_postgres_data` containing `ficcado_website_data`, `ficcado_payment_gateway_data`, and test DBs; plus Redis session/cache volumes). Host PostgreSQL `ficcado_data` (port 5432) contains customers, items, orders, and sales history.
- **Why this file does not decide it**:
  `Part4WEBSITE.md` Section 4 P4W-1 states: "Never touch the host database ficcado_data (the CRM database; it holds items, sales, customers and their history). It is not part of this reset. If the developer also wants customer accounts removed from ficcado_data, that is a separate decision with data-loss risk to sales history: write it as a question (P4W-Q) and do nothing."
- **Option A**: Reset only Docker Compose databases (`ficcado_website_data`, `ficcado_payment_gateway_data`, Redis session/cache). Zero modification to host `ficcado_data`.
- **Option B**: Developer explicitly specifies a script to truncate customer records in `ficcado_data` while preserving catalog items.
- **My recommendation (optional)**: Option A (strictly protect sales history and CRM data from destruction).
- **Status**: RESOLVED (see docs/AGENT_ANSWERS.md)

---

### P4W-Q-003: Password Reset for Customers Without Email
- **Phase / issue**: P4W-3 / WEB-6
- **What I found (evidence, file:line)**:
  Some customers created through the CRM or legacy imports may only have a phone number and no email address. `Part4WEBSITE.md` Section 4 P4W-3 states: "The reset works for CRM-created customers who have an email but no password (that is how they claim the account; the code proves they own the email). Customers with no email cannot use it; write a question (P4W-Q), do not invent a path."
- **Why this file does not decide it**:
  `Part4WEBSITE.md` forbids OTP via SMS and removes OTP from registration/login. Customers with no email currently have no channel to receive a password reset code.
- **Option A**: Disallow online self-service password reset for customers without an email; display an informative message advising them to contact customer support or visit the store.
- **Option B**: Add a CRM-assisted workflow where an admin can add an email to the customer's account in CRM upon verification.
- **My recommendation (optional)**: Option A in the short term, complemented by Option B in CRM customer management.
- **Status**: RESOLVED (see docs/AGENT_ANSWERS.md)
