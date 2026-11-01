# Agent Answers — Part 4 Website Refactor

This file records the developer's decisions and answers to architectural questions from `docs/AGENT_QUESTIONS.md`.

---

### P4W-Q-001: Session Cookie Lifecycle vs. Persistent Expiry
- **Developer Decision:** **Option A**.
- **Implementation Detail:** Keep session cookie without persistent expiry (`Max-Age` / `Expires` omitted on the `ficcado_customer_session` cookie). Closing the entire browser logs the customer out. While the browser remains open, the session follows the 1-hour (3600s) sliding inactivity window.
- **Status:** RESOLVED

---

### P4W-Q-002: Scope of Database Reset & Development Data Clean Start
- **Developer Decision:**
  In development stage, all data inside DBs is dummy data. For a clean fresh start, we will not update the architecture/logic of `ficcado_data` or any DBs; we erase old data to keep a fresh start.
- **Implementation Detail:**
  1. Docker Compose volumes (`ficcado_postgres_data`, `ficcado_redis_session_data`, `ficcado_redis_cache_data`) are torn down and recreated.
  2. Flyway migrations recreate all schemas cleanly on empty databases (`ficcado_website_data`, `ficcado_payment_gateway_data`, test DBs).
  3. For host `ficcado_data` (CRM DB): existing schema/logic is untouched; any stale/dummy customer sessions or customer auth records can be cleared cleanly while preserving core catalog seeds.
- **Status:** RESOLVED

---

### P4W-Q-003: Customer Email Requirement & Login Primary Key
- **Developer Decision:**
  From now onwards, **every customer must have an email** (mandatory logic). Email is considered the primary identity / key when logging into the website.
- **Implementation Detail:**
  1. Customer registration mandates a valid email address; registration without an email is rejected.
  2. Website authentication uses email + password as primary credentials.
  3. Forgot-password self-service flow operates strictly via customer's mandatory email address.
- **Status:** RESOLVED
