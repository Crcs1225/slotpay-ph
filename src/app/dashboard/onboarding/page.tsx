import type { Metadata } from "next";
import { OrganizationOnboarding } from "@/features/organization-onboarding";

export const metadata: Metadata = { title: "Business setup · SlotPay PH", robots: { index: false, follow: false } };

export default function OnboardingPage() { return <OrganizationOnboarding />; }
