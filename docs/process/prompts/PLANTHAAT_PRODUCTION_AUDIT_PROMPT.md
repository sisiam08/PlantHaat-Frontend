# PlantHaat Production / Launch Readiness Audit

Perform a **read-only audit first**. Do not modify code, environment variables, infrastructure, database, payment settings, or deploy anything.

## Read
- `the workspace AGENTS.md`
- `../../FRONTEND_DESIGN.md`
- Relevant architecture, deployment, security, payment, and testing documentation
- Actual package scripts and configuration

## Audit areas
1. Authentication, authorization, session/cookie handling, and role boundaries
2. Input validation, rate limiting, abuse controls, secrets, and error leakage
3. Payment flow, webhook verification/idempotency, order state transitions, and failure recovery
4. Product/catalog integrity, stock/inventory consistency, cart and checkout correctness
5. Seller onboarding, listing validation, and seller permissions
6. Database migrations, indexes, backups, and recovery assumptions
7. API reliability, logging, monitoring, and operational error handling
8. Performance, caching, image optimization, and Core Web Vitals opportunities
9. Accessibility, responsive UI, localization, and key user journeys
10. SEO/metadata, legal/policy pages, contact/support, and production configuration
11. CI, tests, build, deployment/rollback, and environment separation

## Output
- Executive summary and launch recommendation (block / conditional / ready based on evidence)
- Findings ranked Critical/High/Medium/Low
- Evidence: exact file/route/config or test output
- Exploit/impact or operational consequence
- Concrete remediation and acceptance criteria
- Missing evidence / questions requiring owner confirmation
- Suggested pre-launch checklist

Do not claim a system is secure or production-ready merely because no issue was found. Clearly separate verified facts from assumptions. No code changes until the user approves remediation.
