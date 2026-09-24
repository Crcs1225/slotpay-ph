# SlotPay PH

SlotPay PH coordinates fixed appointments and reservation deposits for Philippine service businesses. This glossary defines the product language independently of implementation details.

## Businesses and people

**Organization**:
A service business operating one workspace and one service location in SlotPay PH.
_Avoid_: Tenant, account, shop

**Member**:
An authenticated person who belongs to an Organization as an Owner, Manager, or Provider.
_Avoid_: User, employee, staff account

**Owner**:
A Member with full authority over the Organization, its Members, settings, bookings, and deposits.

**Manager**:
A Member who manages bookings, customers, providers, and deposit reviews but cannot transfer ownership.
_Avoid_: Receptionist, admin

**Provider**:
A Member or non-login worker who performs Services and owns appointment availability.
_Avoid_: Staff, technician, resource

**Customer**:
A guest who requests or receives a Service from an Organization. A Customer does not need a reusable SlotPay account.
_Avoid_: Client, end user

## Scheduling

**Service**:
A predefined offering with a fixed price, fixed duration, and fixed reservation-deposit amount.
_Avoid_: Product, job, quote

**Availability**:
The times when a Provider can perform a Service after applying working hours, exceptions, active holds, and existing Bookings.
_Avoid_: Slots

**Slot Hold**:
An exclusive, temporary claim on a Provider's time while a Customer verifies their phone number or pays a deposit.
_Avoid_: Booking, reservation

**Booking**:
The durable record of a Customer's requested appointment, including its Provider, Service, schedule, and lifecycle state.
_Avoid_: Slot, event, order

**Cancellation Request**:
A Customer's request to end a Booking. An Owner or Manager decides the outcome and the Deposit Disposition.

**Reschedule Request**:
A Customer's request to move a Booking. An Owner or Manager selects and claims the replacement time.

## Deposits

**Payment Destination**:
A merchant-controlled GCash, Maya, or bank account to which a Customer is instructed to send a Deposit.
_Avoid_: Gateway, SlotPay wallet

**Deposit**:
The single fixed PHP amount required to confirm a Booking. It is separate from the remaining service balance.
_Avoid_: Full payment, installment, charge

**Payment Attempt**:
A claimed transfer submitted toward a Deposit, with or without an uploaded Receipt.
_Avoid_: Payment when no transfer has been accepted

**Receipt**:
A private image supplied as evidence of a Payment Attempt. A Receipt is not proof that money reached the Organization.
_Avoid_: Proof of payment, verified payment

**Extraction**:
Machine-produced fields read from a Receipt, including provider, amount, reference, date, time, and sender when available.
_Avoid_: Verification

**Match Assessment**:
An advisory comparison between an Extraction, its Booking, and previous references or receipts.
_Avoid_: Approval, verification

**Verification**:
The authoritative acceptance of a Deposit by an Owner or Manager, or later by an authenticated payment-provider event.
_Avoid_: OCR match, likely match

**Deposit Disposition**:
The recorded outcome after cancellation: not paid, retained, refund due, or refunded outside SlotPay.

## Platform operations

**Plan**:
The published commercial offer that defines recurring price and included usage for an Organization.
_Avoid_: Package, tier

**Trial**:
A time-bounded entitlement that lets a new Organization use the Plan before its first Subscription payment.
_Avoid_: Free account, beta

**Subscription**:
The Organization's recurring commercial relationship with SlotPay, including its Trial, billing period, payment state, and cancellation state. It is unrelated to Customer Deposits.
_Avoid_: Membership, Deposit payment

**Entitlement**:
The current permission for an Organization to use a metered SlotPay capability, derived from its Trial, Subscription, or a time-bounded administrative adjustment.
_Avoid_: Feature flag, access level

**SMS Credit**:
A prepaid unit consumed when SlotPay sends one billable transactional SMS for an Organization.
_Avoid_: Message allowance, wallet balance

**Merchant Activation**:
SlotPay's approval for an Organization to publish payment instructions after reviewing identity and business evidence.
_Avoid_: Payment verification, KYC certification

**Platform Administrator**:
A SlotPay operator with explicit platform authority to review Organizations, manage commercial exceptions, and investigate operations. Organization ownership never grants this role.
_Avoid_: Owner, Manager, superuser

**Booking Access Link**:
A scoped, expiring link that lets a Customer view and act on one Booking without creating an account.
_Avoid_: Customer login

**Audit Event**:
An immutable record of who changed a security-, booking-, or deposit-sensitive fact, when, and why.
