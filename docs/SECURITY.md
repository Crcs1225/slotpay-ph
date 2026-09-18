# Security and privacy

## Security goals

1. An Organization cannot read or mutate another Organization's data.
2. A Customer can access only the Booking authorized by their scoped token.
3. Receipt and merchant-verification files remain private.
4. OCR output can never verify money.
5. Every sensitive decision is attributable and auditable.
6. Public booking features resist slot blocking, OTP abuse, upload abuse, and merchant impersonation.
7. SlotPay collects and retains only data required for the declared workflow.

## Trust boundaries

| Boundary | Rule |
| --- | --- |
| Browser to Next.js/Convex | Treat every value as untrusted; validate types, lengths, enums, ownership, and current state server-side |
| Auth identity to Organization | Resolve identity to a local user and active membership on every protected call |
| Guest token to Booking | Store only a hash; bind it to one Booking, allowed operations, and an expiry |
| Convex to external provider | Execute in server actions with deployment-scoped secrets and idempotency keys |
| OCR to payment state | Treat all fields as advisory evidence; forbid OCR code from writing `verified` |
| Private files to authorized viewer | Store storage IDs and generate temporary URLs only after authorization |
| Platform admin to merchant evidence | Require a platform role and append an Audit Event for every review decision |

## Tenant isolation

- Use shared `customQuery`, `customMutation`, and action helpers from `convex-helpers` to inject the authenticated user, active membership, Organization, and capabilities.
- Every tenant-owned table carries `organizationId`; every production read uses an index beginning with it unless the lookup is by an unguessable token hash.
- After token lookup, compare the token's Organization/Booking and permitted operation before returning data.
- Never accept `organizationId` as authority. It is a selector checked against resolved access.
- Return narrow view models. Provider views omit receipt, Payment Destination, internal notes, and platform-review fields.
- Test each public function with valid same-tenant access, cross-tenant IDs, disabled membership, wrong role, and unauthenticated calls.

Convex authorization is application-enforced, so these wrappers are mandatory rather than optional helpers.

## Authentication and roles

- Business and Platform Administrator authentication uses Convex Auth. Configure its issuer in `convex/auth.config.ts` and set Auth secrets separately in every deployment.
- Customer OTP and Booking Access Links are product credentials, not Convex Auth sessions.
- Do not trust Next.js middleware or server-rendered session state for authorization. Every protected Convex function resolves the authenticated identity and enforces local membership or platform role.
- OTP codes use a cryptographically secure generator, are stored as hashes, expire quickly, have bounded attempts, and are invalidated after success.
- Invitations and Booking Access Links use at least 128 bits of random entropy and are stored as hashes.
- Owner transfer, Member role changes, disabling, merchant activation, Deposit decisions, and platform suspension require recent authentication when supported.

### Capability matrix

| Capability | Owner | Manager | Provider | Platform admin |
| --- | :---: | :---: | :---: | :---: |
| Organization settings and Payment Destinations | Yes | No | No | No |
| Members and invitations | Yes | No | No | No |
| Services, Providers, availability | Yes | Yes | No | No |
| All calendar and customer records | Yes | Yes | No | No |
| Assigned appointment details | Yes | Yes | Yes | No |
| Receipt image and Deposit decision | Yes | Yes | No | No |
| Own submitted Merchant Activation evidence | Yes | No | No | Yes |
| Merchant Activation decision | No | No | No | Yes |
| Platform suspension and investigation | No | No | No | Yes |

## Public abuse controls

- Verify Cloudflare Turnstile before creating an OTP hold, sending an OTP, or beginning an upload.
- Apply Convex rate limits by Organization, normalized phone, request fingerprint/IP signal, challenge, Booking, and platform-wide budget.
- Permit one active public hold per phone per Organization and cap active holds per fingerprint.
- Use a 10-minute provisional OTP hold and a 30-minute verified payment hold.
- Limit OTP resend and verification attempts; responses must not reveal whether a phone or Customer already exists.
- Allow only JPEG, PNG, and WebP Receipt images within configured byte and pixel limits. Re-encode or reject malformed images before OCR.
- Compute content hashes to flag exact image reuse.
- Keep public errors generic while preserving structured internal reason codes.

## Deposit integrity

- Store money as integer centavos and compare against the Booking's immutable Deposit snapshot.
- Normalize references by provider-specific rules, but retain source text and parser version.
- Duplicate reference or image matches create a `suspicious` signal; they do not expose another tenant and do not prove fraud.
- Only Owner/Manager acceptance or a future authenticated provider webhook can set `verified`.
- Staff acceptance of mismatches or suspicious attempts requires a reason.
- Exactly one Payment Attempt may satisfy a Booking. Acceptance is idempotent and transactional.
- Future webhooks must verify provider signatures, reject stale/replayed events, and deduplicate provider event IDs.

## Private files and retention

- Store Receipt and merchant-evidence files in Convex private storage and persist only storage IDs.
- Resolve a temporary URL after authorization; do not persist URLs in documents or logs.
- Do not include files, OCR text, OTPs, tokens, full payment destinations, or secrets in Audit Events or analytics.
- Original Receipts are deleted 90 days after `completed`, `cancelled`, `no_show`, or `expired`.
- Structured Deposit and Audit records remain exportable after file deletion.
- Raw OCR provider responses, if retained for diagnosis, have a shorter deletion schedule than the source Receipt.
- Merchant evidence is deleted after a documented post-decision period; only decision metadata remains.
- Account deletion follows a documented export, legal-hold, and delayed-erasure process rather than immediate destructive deletion.

The National Privacy Commission requires transparency, legitimate purpose, proportionality, a retention schedule, and secure disposal. Whether any merchant Receipt must be retained as an accounting source document requires Philippine legal/accounting review; SlotPay must not silently make that classification.

Primary references:

- [Data Privacy Act implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)
- [BIR Revenue Regulations No. 5-2014](https://bir-cdn.bir.gov.ph/BIR/pdf/RR%205-2014.pdf)

## External processors

Before production use, record each provider's purpose, data categories, region, retention, subprocessors, security terms, deletion behavior, and incident contact.

- Google Document AI receives Receipt images for OCR. Use an approved regional processor version and avoid preview versions that do not satisfy residency requirements.
- Semaphore receives mobile numbers and transactional SMS content.
- Resend receives email addresses and transactional email content.
- Convex and Vercel process application and operational data.

The customer privacy notice and merchant data-processing terms must identify the relevant processing and retention. Do not use Receipt data to train a custom extractor without a separate lawful basis, consent/contract analysis, redaction process, and opt-out/deletion procedure.

## Secrets and deployment

- Keep external provider keys in Convex environment variables and frontend-safe public configuration in Vercel.
- Never prefix secrets with `NEXT_PUBLIC_`.
- Configure secrets independently for development, preview, and production; do not assume they copy between deployments.
- Use least-privilege Google service credentials scoped to the chosen processor.
- Rotate keys after suspected exposure and document ownership and rotation cadence.
- CI may validate variable names but must never print secret values.

## Audit and incident readiness

Audit at minimum:

- Member, role, ownership, and invitation changes
- Payment Destination changes and ownership attestation
- Merchant Activation submission and decision
- Booking creation, reschedule, cancellation, completion, no-show, and expiry
- Deposit acceptance, rejection, mismatch override, refund-due, external-refund, and retention decisions
- Platform suspension and privileged data access

Prepare runbooks for cross-tenant exposure, leaked receipt URLs, compromised provider keys, OTP/SMS abuse, merchant impersonation, and incorrect Deposit acceptance. A production launch requires an incident owner, notification decision process, and tested data export/deletion procedure.

## Pre-launch security gate

- Threat-model review complete
- Tenant-isolation test suite green
- Receipt authorization and deletion tests green
- Public rate limits and Turnstile tested
- Convex Auth recovery and issuer configuration tested in production-like preview
- Merchant Activation blocks payment publication before approval
- Google/Semaphore/Resend agreements and privacy disclosures reviewed
- Philippine privacy, consumer, tax-record, and wallet-policy review completed by qualified advisers
- Backup/export and incident-response procedures rehearsed
