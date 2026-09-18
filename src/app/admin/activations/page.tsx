import type { Metadata } from "next";
import { ActivationAdmin } from "@/features/activation-admin";

export const metadata: Metadata = { title: "Activation queue · SlotPay PH", robots: { index: false, follow: false } };

export default function ActivationQueuePage() { return <ActivationAdmin />; }
