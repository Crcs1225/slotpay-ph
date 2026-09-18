import type { Booking, Organization, Provider, Service } from "@/entities/booking";

export const organization: Organization = {
  id: "org_glow",
  name: "Glow Studio",
  slug: "glowstudio",
  address: "Kapitolyo, Pasig City",
  paymentDestination: "GCash 0917 842 1160, Glow Studio",
};

export const services: Service[] = [
  { id: "gel", name: "Gel manicure", durationMinutes: 75, price: 1200, deposit: 500 },
  { id: "lash", name: "Classic lash set", durationMinutes: 120, price: 1800, deposit: 700 },
  { id: "brow", name: "Brow shaping", durationMinutes: 45, price: 650, deposit: 300 },
];

export const providers: Provider[] = [
  { id: "nicole", name: "Nicole", role: "Nail artist" },
  { id: "camille", name: "Camille", role: "Lash artist" },
];

export const initialBookings: Booking[] = [
  {
    id: "SP-1045",
    customerName: "Maria Santos",
    customerMobile: "0917 234 8801",
    serviceId: "gel",
    providerId: "nicole",
    date: "Sep 24",
    time: "2:00 PM",
    appointmentStatus: "pending",
    depositStatus: "needs_review",
    receipt: {
      provider: "GCash",
      amount: 500,
      reference: "9218 4031 7720",
      confidence: "high",
      signals: ["Amount matches", "Reference is unused", "Sent within hold period"],
    },
  },
  {
    id: "SP-1046",
    customerName: "Angela Cruz",
    customerMobile: "0918 603 1149",
    serviceId: "lash",
    providerId: "camille",
    date: "Sep 24",
    time: "11:00 AM",
    appointmentStatus: "confirmed",
    depositStatus: "verified",
  },
  {
    id: "SP-1047",
    customerName: "Sofia Reyes",
    customerMobile: "0920 551 0834",
    serviceId: "gel",
    providerId: "nicole",
    date: "Sep 24",
    time: "3:30 PM",
    appointmentStatus: "pending",
    depositStatus: "suspicious",
    receipt: {
      provider: "GCash",
      amount: 300,
      reference: "8810 4402 1931",
      confidence: "low",
      signals: ["Expected ₱500", "Reference appeared before"],
    },
  },
  {
    id: "SP-1048",
    customerName: "Bea Lim",
    customerMobile: "0915 824 6690",
    serviceId: "brow",
    providerId: "camille",
    date: "Sep 24",
    time: "12:30 PM",
    appointmentStatus: "pending",
    depositStatus: "awaiting_payment",
  },
  {
    id: "SP-1049",
    customerName: "Carla Mendoza",
    customerMobile: "0998 192 3110",
    serviceId: "gel",
    providerId: "nicole",
    date: "Sep 24",
    time: "5:00 PM",
    appointmentStatus: "expired",
    depositStatus: "awaiting_payment",
  },
];

export const timeSlots = ["10:00 AM", "11:30 AM", "2:00 PM", "3:30 PM"];
