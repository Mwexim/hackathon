// All event- and action-specific UI copy lives here, so the components in
// components/life/ stay generic across moved_house, new_baby and frequent_traveller.

import { Baby, House, Plane, type LucideIcon } from "lucide-react";
import type { Customer, InsurancePolicy, LifeEventType } from "@/lib/types";

export const LIFE_COPY: Record<
  LifeEventType,
  { icon: LucideIcon; label: string; question: string; confirmedTitle: string; confirmedText: string; dismissedText: string }
> = {
  moved_house: {
    icon: House,
    label: "A new home?",
    question: "Have you recently moved?",
    confirmedTitle: "Congratulations on your new home!",
    confirmedText: "Let's make sure your contracts move with you.",
    dismissedText: "Understood. We won't use these signals for this.",
  },
  new_baby: {
    icon: Baby,
    label: "A new family member?",
    question: "Has your family grown?",
    confirmedTitle: "Congratulations on your new family member!",
    confirmedText: "Let's make sure everyone at home is covered.",
    dismissedText: "Understood. We won't use these signals for this.",
  },
  frequent_traveller: {
    icon: Plane,
    label: "Travelling more?",
    question: "Are you travelling more often?",
    confirmedTitle: "Enjoy your travels!",
    confirmedText: "Let's check that you're covered on the road.",
    dismissedText: "Understood. We won't use these signals for this.",
  },
};

type Ctx = { customer: Customer; policies: InsurancePolicy[] };

export type ActionCopy =
  | {
      type: "change"; // a service action that changes an existing contract
      summary: (ctx: Ctx) => { label: string; from: string; to: string } | null;
      confirmLabel: string;
      successText: string;
    }
  | {
      type: "reassure"; // "you don't need anything"
      details: string[];
      confirmLabel: string;
      successText: string;
    }
  | {
      type: "offer"; // commercial proposal (demo only)
      headline: string;
      points: string[];
      confirmLabel: string;
      successText: string;
    };

const find = (ps: InsurancePolicy[], t: InsurancePolicy["type"]) => ps.find((p) => p.type === t);

export const ACTION_COPY: Record<string, ActionCopy> = {
  rec_move_update_home_insurance: {
    type: "change",
    summary: ({ customer, policies }) => {
      const home = find(policies, "home");
      return home ? { label: "Home insurance address", from: home.insuredAddress ?? "—", to: customer.address } : null;
    },
    confirmLabel: "Confirm change",
    successText: "Done. Your home insurance now covers your new address.",
  },
  rec_baby_add_to_family_insurance: {
    type: "change",
    summary: ({ policies }) => {
      const fam = find(policies, "family_liability");
      return fam
        ? { label: "Covered household members", from: String(fam.coveredHouseholdMembers), to: String(fam.coveredHouseholdMembers + 1) }
        : null;
    },
    confirmLabel: "Confirm change",
    successText: "Done. Your child is now covered by your family insurance.",
  },
  rec_travel_already_covered: {
    type: "reassure",
    details: [
      "Medical costs abroad and repatriation",
      "Trip cancellation for bookings paid with your card",
      "Lost or delayed luggage",
      "Valid worldwide, for trips up to 90 days",
    ],
    confirmLabel: "Got it",
    successText: "Great — you're all set. Have a good trip!",
  },
  rec_move_home_financing: {
    type: "offer",
    headline: "Home loan simulation — no commitment",
    points: ["See what a loan could look like for you", "Talk to an advisor when you're ready"],
    confirmLabel: "Start demo application",
    successText: "Demo application started",
  },
  rec_move_energy_options: {
    type: "offer",
    headline: "Compare energy offers for your new address",
    points: ["Side-by-side comparison of providers", "Switch in a few taps"],
    confirmLabel: "Start demo application",
    successText: "Demo application started",
  },
  rec_baby_children_savings: {
    type: "offer",
    headline: "Children's savings account, from € 25/month",
    points: ["Save automatically every month", "Available to your child later in life"],
    confirmLabel: "Start demo application",
    successText: "Demo application started",
  },
  rec_baby_family_budget: {
    type: "offer",
    headline: "Family budget planner",
    points: ["See new monthly costs like childcare at a glance", "Set savings goals together"],
    confirmLabel: "Start demo application",
    successText: "Demo application started",
  },
  rec_travel_annual_insurance: {
    type: "offer",
    headline: "Annual travel insurance",
    points: ["One policy for all your trips this year", "Covers the whole family"],
    confirmLabel: "Start demo application",
    successText: "Demo application started",
  },
};
