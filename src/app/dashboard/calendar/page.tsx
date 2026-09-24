import type { Metadata } from "next";
import { BookingCalendar } from "@/features/booking-calendar";

export const metadata: Metadata = { title: "Calendar · SlotPay PH", robots: { index: false, follow: false } };

export default function CalendarPage() {
  return <BookingCalendar />;
}
