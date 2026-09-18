# Business risks and validation

## Core hypotheses

SlotPay should be funded by evidence, not enthusiasm. The current hypotheses are:

1. Fixed-appointment Philippine service businesses experience recurring pain from scattered chat bookings and manually reviewed transfer screenshots.
2. A bring-your-own GCash/Maya/bank workflow is valuable to businesses that cannot or will not onboard to a payment gateway.
3. Centralized booking, pre-checked Receipts, and reminders save enough time or reduce enough no-shows to justify recurring payment.
4. Customers will complete an accountless booking flow that includes SMS OTP, an off-platform transfer, and Receipt upload.
5. Businesses will keep SlotPay's calendar current by recording bookings received through chat, phone, and walk-in channels.

## Risk register

| Risk | Impact | Early signal | Mitigation / decision gate |
| --- | --- | --- | --- |
| Direct local competition | “Philippine booking + deposits” is not distinctive; Reserve.ph already markets booking, local payments, and reminders | Prospects compare primarily on price/features | Validate the bring-your-own-wallet wedge with interviews; do not build generic salon-suite features |
| Gateway products are objectively safer | Integrated gateways verify funds while SlotPay screenshots cannot | Prospects prefer automatic payment confirmation | Position V1 as faster review and onboarding bridge; add a provider integration only after demand is proven |
| Pain is not frequent enough | Owners tolerate current Messenger/GCash workflow | Few weekly receipts or little review time | Prioritize businesses with 10–50+ weekly inquiries and required deposits |
| Broad market dilutes onboarding | Cross-industry language and defaults feel generic | Low setup completion or repeated custom requests | Keep behavior narrow: fixed price, duration, Provider, place, and Deposit; segment messaging after interviews |
| Calendar never becomes source of truth | Staff continue accepting chat/walk-in bookings elsewhere | Conflicts persist; low staff-created Booking use | Make internal Booking fast and mobile-first; measure off-platform Booking capture |
| Customer conversion friction | OTP + transfer + upload causes abandonment | Drop-off between slot choice, OTP, payment, and upload | Instrument each step; test copy and hold duration; retain accountless checkout |
| Screenshot confidence is misunderstood | Staff treat “likely match” as proof | Acceptance without wallet check | Use advisory wording, mandatory human decision, training, and reasoned overrides |
| OCR accuracy is weak | GCash/Maya layouts change or banks vary | High unreadable/manual-correction rate | Version deterministic parsers, preserve source text, maintain a consented redacted evaluation set, always allow manual review |
| Merchant impersonation/scams | Bad actors publish pages and collect deposits | Complaints, mismatched identities, charge disputes | Manual activation, payment-account attestation, visible recipient identity, suspension and incident process |
| Personal-wallet limits or terms | Merchants cannot receive more funds or use the account as intended | Failed transfers or frozen/limited wallets | Disclose responsibility and limits; encourage suitable business accounts without claiming provider affiliation |
| Negative unit economics | Subscription revenue does not cover SMS, OCR, storage, support, and activation | High provider usage or support time per retained Organization | Plan limits, prepaid SMS Credits, concise messages, abuse limits, and cost dashboards |
| SMS delivery is unreliable | OTPs/reminders arrive late or are blocked | Delivery failures and booking abandonment | Register sender name before launch, monitor credits/delivery, email fallback, provider seam |
| Manual activation does not scale | Review queue delays publication | Long activation time or inconsistent decisions | Standard checklist, limited evidence, reviewer audit, service-level target; automate only after patterns stabilize |
| Manual Deposit review remains burdensome | Product centralizes work but saves little time | Review time does not improve | Measure median review time and correction rate; stop investing in OCR if it does not materially help |
| Refund and cancellation disputes | Customer believes SlotPay controls funds/policy | Support tickets and reputational damage | Clear merchant policy acceptance, explicit external refund state, preserved audit trail, no “SlotPay refund” language |
| Privacy or security incident | Receipts expose names, balances, references, or phone numbers | Unauthorized access or leaked URL | Private storage, narrow roles, token hashing, retention deletion, processor contracts, incident response |
| Convex Auth beta changes | Authentication integration requires migration or fails in edge cases | Breaking release, recovery problem, or experimental Next.js integration limitation | Keep authenticated flows client-driven, isolate local identity mapping, pin versions, test recovery, and preserve the ADR migration seam |
| Dependency concentration | Convex is database, backend, storage, scheduler, and realtime | Outage or pricing change has broad impact | Export capability, operational limits, adapter isolation, documented recovery; accept concentration for MVP speed |
| Temporary brand becomes sticky | Name conflicts or implies payment processing | Trademark/domain concern or customer confusion | Treat SlotPay PH as working name; perform legal/domain review before paid launch |

## Regulatory and policy pitfalls

- SlotPay processes personal data and private Receipt images. Privacy notice, merchant terms, processor agreements, data-subject procedures, breach response, and a retention schedule are launch requirements.
- SlotPay does not issue tax invoices or accounting records. Merchants remain responsible for required bookkeeping and exports; obtain Philippine legal/accounting advice on Receipt classification.
- Do not market SlotPay as a payment processor, escrow, wallet, money service, or official GCash/Maya integration.
- Deposit, cancellation, no-show, and refund terms are merchant policies shown before payment. SlotPay records acceptance and outcomes but does not decide merchant policy automatically.
- Transactional SMS requires sender registration, consent/purpose discipline, and an opt-out strategy if any non-transactional messaging is introduced later.
- Merchant Activation is risk screening, not a guarantee to customers. Avoid “verified business” claims unless the verification standard and liability are deliberately defined.

## Validation program

### Interviews

Interview 15–30 businesses. Recruit across several industries but only when they fit the fixed-appointment model. Ask for recent examples and artifacts, not opinions about a hypothetical app.

Capture:

- weekly inquiry, booking, and Deposit volume;
- exact booking/payment channels and responsible staff;
- actual no-show, duplicate, fake/reused Receipt, and missed-record events;
- time from inquiry to confirmation and time spent reviewing;
- wallet type, limits, and gateway onboarding history;
- existing calendar/software and switching barriers;
- willingness to trial, import setup, and pay after demonstrated value.

### Competitive testing

Ask prospects to compare the SlotPay prototype with their current workflow and direct alternatives such as Reserve.ph, Fresha, Calendly plus payment links, and spreadsheets/forms. Record why a bring-your-own-wallet workflow wins or loses.

### Product evidence

Recruit 3–5 manually activated pilot businesses even though onboarding is self-serve. Track real usage for at least four weeks.

Evidence to continue:

- businesses route real customers through SlotPay repeatedly;
- staff record off-platform Bookings so the calendar stays complete;
- Receipt review time falls materially from the baseline;
- no-show/deposit completion trends improve or administrative effort falls;
- at least some retained businesses commit to a paid plan or paid continuation.

Evidence to narrow, pivot, or stop:

- owners praise the concept but return to Messenger-only workflows;
- most prospects already prefer gateway-integrated competitors;
- payment review remains nearly as slow because wallet checking dominates;
- customer abandonment makes completed bookings worse than the existing process;
- support, SMS, OCR, and activation costs exceed plausible subscription revenue.

## Metrics and unit economics

Dashboard cohorts by Organization activation month and track:

- activation completion and time to activation;
- first Booking and first verified Deposit time;
- weekly active Organizations and four-week retention;
- public vs staff-created Bookings;
- Booking funnel conversion by step;
- Deposit completion, review time, mismatch, suspicious, duplicate, and rejection rates;
- OCR success/correction rate by payment provider and parser version;
- SMS segments, OCR calls, storage, support time, and activation-review time per Organization;
- no-show rate where businesses consistently mark outcomes;
- willingness-to-pay interviews and manual paid-plan tests.

Launch at ₱499 per month after a 14-day Trial, then revisit price and limits only after observing conversion, retention, cost-to-serve, and support burden. Usage limits and prepaid SMS Credits prevent unbounded provider costs.

## Sources to revisit before launch

- [Reserve.ph](https://reserve.ph/) — direct local positioning and feature comparison
- [Fresha payment policies](https://www.fresha.com/help-center/knowledge-base/payments/613-payments-policies-overview) — integrated-deposit benchmark
- [GCash personal wallet limits](https://help.gcash.com/hc/en-us/articles/360021112894-What-are-my-GCash-wallet-and-transaction-limits)
- [GCash for Business requirements](https://help.gcash.com/hc/en-us/articles/48456974006041-What-are-the-requirements-to-create-a-GCash-for-Business-merchant-account)
- [Semaphore API](https://www.semaphore.co/docs)
- [National Privacy Commission implementing rules](https://privacy.gov.ph/implementing-rules-regulations-data-privacy-act-2012/)

These sources and commercial terms can change; verify them again at implementation and launch.
