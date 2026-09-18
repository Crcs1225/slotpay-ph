# Product flows

## Merchant onboarding and activation

```mermaid
sequenceDiagram
  actor Owner
  participant Web as SlotPay web
  participant Auth as Convex Auth
  participant Backend as Convex
  actor Admin as Platform admin

  Owner->>Auth: Sign up / sign in
  Auth-->>Web: Authenticated identity
  Owner->>Backend: Create Organization
  Owner->>Backend: Configure profile, location, Services, Providers, availability, payment destinations
  Owner->>Backend: Attest payment-account control
  Owner->>Backend: Submit merchant evidence
  Backend-->>Owner: Preview available; deposit collection disabled
  Admin->>Backend: Review identity and business evidence
  alt approved
    Admin->>Backend: Activate Organization
    Backend-->>Owner: Public booking and payment instructions enabled
  else rejected
    Admin->>Backend: Reject with reason
    Backend-->>Owner: Correct and resubmit
  end
```

An unactivated Organization may finish setup and preview its page. It may not expose payment instructions or accept public Deposit evidence.

## Trial, subscription, and entitlement

```mermaid
stateDiagram-v2
  [*] --> Trialing: Organization created
  Trialing --> Active: PayMongo Subscription activated
  Trialing --> Unpaid: 14 days elapsed
  Active --> PastDue: recurring payment failed
  PastDue --> Active: payment recovered
  PastDue --> Unpaid: seven-day grace elapsed
  Active --> Cancelling: Owner cancels
  Cancelling --> Cancelled: billing period ends
  Unpaid --> Active: payment completed
  Unpaid --> ManualReview: manual billing requested
  ManualReview --> Active: admin records expiring entitlement
```

Merchant Activation and Subscription state remain independent. An Organization must be both activated and entitled to receive new public Bookings. Billing restrictions never hide existing Bookings or Customer data. Only a verified, idempotent PayMongo webhook or an audited Platform Administrator adjustment changes paid entitlement.

## Public booking, OTP, and payment hold

```mermaid
sequenceDiagram
  actor Customer
  participant Web
  participant Availability as Availability Engine
  participant Booking as Booking Lifecycle
  participant SMS as Semaphore

  Customer->>Web: Choose Service and date
  Web->>Availability: List available starts
  Availability-->>Web: Starts with any eligible Provider
  Customer->>Booking: Select start and enter contact details
  Booking->>Booking: Verify Turnstile and rate limits
  Booking->>Booking: Atomically create 10-minute OTP hold
  Booking->>SMS: Send one-time code
  Customer->>Booking: Submit code
  alt valid code
    Booking->>Booking: Create/update Customer and pending Booking
    Booking->>Booking: Convert to 30-minute payment hold
    Booking-->>Customer: Booking Access Link and payment instructions
  else invalid or expired
    Booking-->>Customer: Retry within limits or release hold
  end
```

The provisional hold prevents the chosen time from disappearing during OTP delivery. Phone, device/IP fingerprint, Organization, and challenge limits constrain abuse.

## Receipt submission and review

```mermaid
stateDiagram-v2
  [*] --> AwaitingPayment: OTP verified
  AwaitingPayment --> Expired: 30 minutes; no receipt/payment
  AwaitingPayment --> Processing: receipt submitted
  Processing --> NeedsReview: readable, no strong anomaly
  Processing --> Suspicious: mismatch, duplicate, or unusual structure
  Processing --> NeedsReview: OCR unavailable/unreadable
  NeedsReview --> Verified: owner/manager accepts
  Suspicious --> Verified: owner/manager accepts with reason
  NeedsReview --> Rejected: owner/manager rejects
  Suspicious --> Rejected: owner/manager rejects
  Rejected --> AwaitingPayment: open 30-minute resubmission window
  Rejected --> Expired: resubmission window expires
  Verified --> [*]
  Expired --> [*]
```

```mermaid
sequenceDiagram
  actor Customer
  participant Booking as Booking Lifecycle
  participant Storage as Convex Storage
  participant OCR as Google Document AI
  participant Match as Deposit Review
  actor Manager

  Customer->>Booking: Request one-use upload authorization
  Customer->>Storage: Upload Receipt
  Customer->>Booking: Submit storage ID
  Booking->>Booking: Replace expiring payment hold with protected review hold
  Booking->>OCR: Schedule OCR action
  OCR-->>Match: Text, layout, quality
  Match->>Match: Parse provider layout and compare expected Deposit
  Match->>Match: Check reference and image hashes
  Match-->>Manager: Needs Review or Suspicious
  alt accept
    Manager->>Match: Verify with reason/source
    Match->>Booking: Confirm appointment
    Booking-->>Customer: Confirmation and reminders
  else reject
    Manager->>Match: Reject with reason
    Match->>Booking: Start 30-minute resubmission hold
    Booking-->>Customer: Rejection and new deadline
  end
```

The protected review hold does not auto-expire. Overdue reviews create dashboard alerts and notification escalation rather than risking a second customer paying for the same time.

## Staff-created booking

1. Owner or Manager selects or creates an Organization-local Customer.
2. Staff selects Service, time, and optionally a Provider.
3. The Availability Engine claims an eligible Provider atomically.
4. Staff chooses whether the configured Deposit is already externally verified or should be requested.
5. If requested, SlotPay sends the Booking Access Link and starts the payment window.
6. If externally verified, staff records source and reason; the Booking is confirmed and audited without requiring a Receipt.

## Cancellation

```mermaid
flowchart TD
  A[Customer opens Booking Access Link] --> B[Submit Cancellation Request]
  B --> C[Owner/Manager reviews]
  C -->|Decline| D[Booking unchanged; customer notified]
  C -->|Approve, no verified deposit| E[Cancel Booking; disposition not_paid]
  C -->|Approve, keep deposit| F[Cancel Booking; disposition retained]
  C -->|Approve, refund needed| G[Cancel Booking; disposition refund_due]
  G --> H[Merchant refunds outside SlotPay]
  H --> I[Record refunded_external with reason]
```

Cancellation releases future Provider time, cancels pending reminders, preserves all Booking and Deposit history, and records an Audit Event.

## Rescheduling

1. Customer submits a Reschedule Request with optional preferences.
2. Owner or Manager selects a replacement time and Provider.
3. One mutation verifies the replacement, claims it, updates Booking schedule snapshots, and releases the previous time.
4. The existing verified Deposit remains attached.
5. Old reminders are cancelled; new confirmation and reminder intents are scheduled.
6. If no replacement is acceptable, staff declines the request and the original Booking remains unchanged.

Customers cannot self-reschedule in V1.

## Appointment completion

- Owner or Manager marks a confirmed Booking `completed` or `no_show`.
- A Provider may mark only an assigned Booking completed if the capability matrix permits it; they cannot alter Deposit state.
- Completion schedules Receipt deletion for 90 days later.
- Cancellation or expiry also schedules deletion relative to the terminal timestamp.

## Notification delivery

```mermaid
sequenceDiagram
  participant Domain as Domain mutation
  participant Queue as Notification record
  participant Scheduler as Convex scheduler
  participant SMS as Semaphore adapter
  participant Email as Resend adapter

  Domain->>Queue: Upsert intent by idempotency key
  Scheduler->>Queue: Claim due notification
  Scheduler->>SMS: Send transactional SMS
  alt SMS accepted
    SMS-->>Queue: Store provider ID and sent state
  else SMS fails and email exists
    SMS-->>Queue: Store failure
    Scheduler->>Email: Send fallback email
    Email-->>Queue: Store outcome
  else all channels fail
    Scheduler->>Queue: Retry with bounded backoff or mark failed
  end
```

Templates remain transactional and concise. SMS messages use the registered SlotPay sender name and full SlotPay domain rather than public URL shorteners.
