# Product specification

## Product promise

SlotPay PH gives Philippine service businesses one place to manage appointments and deposits, with receipts pre-checked for faster confirmation.

SlotPay does not claim that a screenshot proves payment. In V1, only an Owner or Manager can accept a screenshot-backed deposit. A future authenticated payment-provider event may also verify a deposit.

## Target market

V1 is industry-neutral but behaviorally narrow. It serves a single-location business when each bookable offering has:

- a fixed price in Philippine pesos;
- a fixed duration;
- a specific appointment start time;
- an assigned service Provider; and
- one fixed reservation Deposit.

Examples include beauty studios, barbers, tutors, photographers, repair shops, and other scheduled providers. Quote-based projects, variable-duration field work, travel routing, materials estimates, and customer-site jobs are excluded.

## Launch wedge

Businesses keep using a merchant-controlled GCash, Maya, or bank account. SlotPay organizes the booking, payment instructions, receipt evidence, matching signals, review, confirmation, and reminders without holding funds or requiring gateway onboarding.

An Organization must attest that it controls each configured Payment Destination and is responsible for the provider's terms and limits. SlotPay must not describe this workflow as an official GCash, Maya, or bank integration.

## Actors and permissions

| Actor | Main capabilities |
| --- | --- |
| Platform administrator | Reviews Merchant Activation, suspends abusive Organizations, and investigates platform audit events |
| Owner | Controls Organization settings, Members, Providers, Services, payment instructions, Bookings, receipts, and deposit decisions |
| Manager | Runs the calendar, customers, Providers, Bookings, receipts, and deposit decisions |
| Provider | Sees assigned appointments and the minimum customer details needed to perform them; cannot view receipt images or decide deposits |
| Customer | Books as a guest, verifies a mobile number, submits a Receipt, and uses a Booking Access Link for status and requests |

Custom roles and permissions are outside V1.

## V1 capabilities

### Organization setup

- Public business sign-up using Convex Auth.
- One Organization and one physical service location.
- Profile, unique public slug, operating details, Payment Destinations, Services, Providers, weekly availability, and schedule exceptions.
- Self-serve setup and preview, followed by manual Merchant Activation before payment instructions can be published.
- A 14-day Trial followed by one ₱499 monthly Plan with PayMongo recurring billing and a time-bounded manual billing fallback.
- The Plan includes one location, 150 Bookings, three active Members, 150 Receipt Extractions, and email reminders per billing period. SMS uses prepaid SMS Credits.

### Booking and calendar

- Public booking page with Service, date, available time, and customer contact collection.
- One-time SMS OTP before the exclusive payment hold is finalized.
- Provider-owned availability with automatic assignment to an eligible Provider.
- Owner/Manager creation of bookings received through Messenger, phone, or walk-in channels.
- Organization calendar and review inbox.
- Customer Cancellation Requests and Reschedule Requests resolved by an Owner or Manager.
- Staff rescheduling claims the new time atomically and preserves the accepted Deposit history.

### Deposits and receipts

- One fixed PHP Deposit per Service. The remaining service balance is informational and collected outside SlotPay.
- GCash, Maya, and bank-transfer instructions supplied by the Organization.
- Private Receipt upload and Google Document AI OCR.
- Deterministic provider templates that normalize amount, reference, date, time, provider, and sender when present.
- Advisory match results and duplicate-reference/duplicate-image warnings.
- Manual acceptance, rejection, and externally verified payment recording with required audit reasons.
- Original Receipt deletion 90 days after a Booking reaches a terminal state.

### Notifications

- Semaphore SMS as the required V1 channel.
- Email fallback when an address is present; Resend is the initial email adapter.
- Messages for Booking Access Links, unpaid deposits, overdue reviews, confirmation, cancellation/rescheduling outcomes, and appointment reminders.
- No promotional messaging or marketing automation.

## Lifecycle rules

Appointment and Deposit states are independent.

**Appointment states**: `pending`, `confirmed`, `completed`, `cancelled`, `no_show`, `expired`.

**Deposit states**: `awaiting_payment`, `processing`, `needs_review`, `suspicious`, `verified`, `rejected`, `refund_due`, `refunded_external`, `retained`.

Rules:

1. A provisional hold protects the selected Provider while the OTP is completed.
2. Successful OTP verification creates or activates a pending Booking and a 30-minute payment hold.
3. No Receipt or accepted external payment before expiry makes the Booking `expired` and releases the Provider.
4. Receipt submission changes the Deposit to `processing` and keeps the Provider protected without automatic expiry.
5. OCR and matching may produce `needs_review` or `suspicious`; neither confirms the Booking.
6. Staff acceptance makes the Deposit `verified` and the Appointment `confirmed`.
7. Rejection opens a new 30-minute resubmission window. Failure to resubmit expires the Booking.
8. Cancellation never deletes the Booking or its payment history. Staff records the Deposit Disposition.

## Explicit non-goals

- Quote and estimate workflows
- Multiple branches or customer-location travel
- Full accounting, invoicing, tax receipts, payroll, inventory, POS, CRM, or employee scheduling
- Marketplace discovery, e-commerce, delivery, loyalty, or marketing automation
- Customer accounts and reusable passwords
- Deposit installments, split tender, full-balance collection, chargebacks, or automatic refunds
- Automatic screenshot verification
- Annual Plans, coupons, automatic usage overages, and tax-invoice automation

## Validation and product metrics

Before expanding scope, conduct 15–30 workflow interviews and recruit 3–5 activated pilot businesses. Continue investment only when businesses repeatedly use SlotPay for real bookings and demonstrate willingness to pay.

Measure:

- Organizations onboarded, activated, and weekly active
- Public and staff-created Bookings
- Booking completion and Deposit payment rates
- Median time from Receipt upload to Deposit decision
- Extraction success, manual-review, suspicious, and duplicate rates
- Expired holds, cancellations, reschedules, and no-shows
- SMS/email delivery success
- Four-week Organization retention and stated/observed willingness to pay

The launch price is ₱499 per month after a 14-day Trial. Pricing remains subject to measured conversion, retention, and cost-to-serve data rather than registration volume.
