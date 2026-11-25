# Threat Model Template

Fill this in during the **Map** phase. Answer all five questions with specific details from the codebase.

---

## 1. What are we protecting?

| Asset | Sensitivity | Where Stored | Encrypted at Rest? |
|-------|------------|--------------|---------------------|
| User credentials (passwords) | Critical | Database `users` table | Hashed with ______ |
| Session tokens | Critical | Cookies / database | |
| Personal data (name, email, phone) | High | Database `users` table | |
| Payment data | Critical | ______ (provider-tokenized?) | |
| API keys and secrets | Critical | Environment variables / ______ | |
| User-generated content | Medium | Database / file storage | |
| Application logs | Low-Medium | ______ | |

---

## 2. Who might attack, and why?

| Threat Actor | Motivation | Capability |
|-------------|-----------|------------|
| Opportunistic attacker | Credential stuffing, data resale | Automated tools, leaked credential lists |
| Competitor | Business intelligence, disruption | Moderate — targeted but not state-level |
| Disgruntled user | Revenge, data theft | Account access, knowledge of the product |
| Insider (employee, contractor) | Financial gain, accident | Elevated access, knows the codebase |
| Automated scanner | Mass exploitation of known CVEs | Shodan, Nuclei, common exploit kits |

Add or remove rows based on the actual business context.

---

## 3. What are the entry points?

| Entry Point | Type | Auth Required? | Input Validated? | Rate Limited? |
|------------|------|---------------|-----------------|---------------|
| `POST /api/auth/login` | Form / API | No | | |
| `POST /api/auth/signup` | Form / API | No | | |
| `POST /api/auth/reset-password` | Form / API | No | | |
| `GET /api/users/:id` | API | Yes | | |
| `POST /api/upload` | File upload | Yes | | |
| `POST /api/webhooks/stripe` | Webhook | Signature | | |
| `POST /api/ai/chat` | AI endpoint | Yes | | |
| `/admin/*` | Admin panel | Yes + MFA? | | |

List every route, API endpoint, form, file upload, webhook, background job, and AI/LLM call.

---

## 4. What is the worst case?

For each entry point, state the worst realistic outcome:

| Entry Point | Worst Case |
|------------|-----------|
| Login | Account takeover via credential stuffing or brute force |
| Signup | Spam account creation, resource exhaustion |
| Password reset | Account takeover via enumeration + link interception |
| User data API | Mass data exfiltration (all users' PII) via IDOR |
| File upload | Remote code execution via uploaded script, or storage exhaustion |
| Payment webhook | Fraudulent order fulfillment via forged webhook |
| AI endpoint | Prompt injection leaks system prompt or other users' data, or runs up API bill |
| Admin panel | Full system compromise if accessed by an unauthorized user |

---

## 5. What is our defense for each entry point?

| Entry Point | Current Defense | Gap |
|------------|----------------|-----|
| Login | | |
| Signup | | |
| Password reset | | |
| User data API | | |
| File upload | | |
| Payment webhook | | |
| AI endpoint | | |
| Admin panel | | |

Fill the Gap column honestly. A gap is not a failure — it is work to plan.

---

## Cross-check

Walk the [OWASP Top 10](https://owasp.org/www-project-top-ten/) and confirm each category is covered by at least one defense above:

- [ ] A01: Broken Access Control
- [ ] A02: Cryptographic Failures
- [ ] A03: Injection
- [ ] A04: Insecure Design
- [ ] A05: Security Misconfiguration
- [ ] A06: Vulnerable and Outdated Components
- [ ] A07: Identification and Authentication Failures
- [ ] A08: Software and Data Integrity Failures
- [ ] A09: Security Logging and Monitoring Failures
- [ ] A10: Server-Side Request Forgery
