export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type DepositStatus =
  | "awaiting_payment"
  | "processing"
  | "needs_review"
  | "suspicious"
  | "verified"
  | "rejected"
  | "refund_due"
  | "refunded_external"
  | "retained";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  address: string;
  paymentDestination: string;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
  deposit: number;
}

export interface Provider {
  id: string;
  name: string;
  role: string;
}

export interface ReceiptAssessment {
  provider: "GCash" | "Maya" | "Bank transfer";
  amount: number;
  reference: string;
  confidence: "high" | "medium" | "low";
  signals: string[];
}

export interface Booking {
  id: string;
  customerName: string;
  customerMobile: string;
  serviceId: string;
  providerId: string;
  date: string;
  time: string;
  appointmentStatus: AppointmentStatus;
  depositStatus: DepositStatus;
  receipt?: ReceiptAssessment;
}
