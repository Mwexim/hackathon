// Recommendation catalogue + consent filter.
// Order: service actions (protect an existing contract) first, then commercial.
// Consent: "tailored" -> all; "basic" -> service + at most 1 commercial;
//          "none" -> service only.

import type {
  ConsentLevel,
  InsurancePolicy,
  LifeEventType,
  Recommendation,
} from "@/lib/types";

type Context = { policies: InsurancePolicy[] };

type CatalogueEntry = Recommendation & {
  /** Only show when this returns true for the customer's contracts. */
  eligible?: (ctx: Context) => boolean;
};

const hasPolicy = (type: InsurancePolicy["type"]) => (ctx: Context) =>
  ctx.policies.some((p) => p.type === type);
const hasTravelCover = (ctx: Context) => ctx.policies.some((p) => p.includesTravelCover === true);

export const CATALOGUE: CatalogueEntry[] = [
  // --- moved_house ---
  {
    id: "rec_move_update_home_insurance",
    eventType: "moved_house",
    kind: "service",
    title: "Update the address on your home insurance",
    description: "Make sure your new home is insured, not your old one. It only takes a minute.",
    icon: "🏠",
    actionLabel: "Update address",
    eligible: hasPolicy("home"),
  },
  {
    id: "rec_move_home_financing",
    eventType: "moved_house",
    kind: "commercial",
    title: "Explore home financing",
    description: "Thinking about buying one day? See what a home loan could look like for you.",
    icon: "🔑",
    actionLabel: "Explore",
  },
  {
    id: "rec_move_energy_options",
    eventType: "moved_house",
    kind: "commercial",
    title: "Compare energy options",
    description: "New place, new contracts. Compare energy offers for your new address.",
    icon: "⚡",
    actionLabel: "Compare",
  },

  // --- new_baby ---
  {
    id: "rec_baby_add_to_family_insurance",
    eventType: "new_baby",
    kind: "service",
    title: "Add your child to your family insurance",
    description: "Your family liability insurance covers the people you registered. Add your child so everyone is covered.",
    icon: "👨‍👩‍👧",
    actionLabel: "Add family member",
    eligible: hasPolicy("family_liability"),
  },
  {
    id: "rec_baby_children_savings",
    eventType: "new_baby",
    kind: "commercial",
    title: "Start a children's savings account",
    description: "Put something aside for their future, starting with small monthly amounts.",
    icon: "🐷",
    actionLabel: "Start saving",
  },
  {
    id: "rec_baby_family_budget",
    eventType: "new_baby",
    kind: "commercial",
    title: "Plan your family budget",
    description: "Get a clear view of new monthly costs like childcare and how they fit your budget.",
    icon: "📊",
    actionLabel: "Plan budget",
  },

  // --- frequent_traveller ---
  {
    id: "rec_travel_already_covered",
    eventType: "frequent_traveller",
    kind: "service",
    title: "You're already covered for travel with your card",
    description: "Your credit card includes travel insurance. No need to buy extra cover — here's what it includes.",
    icon: "✈️",
    actionLabel: "See what's covered",
    eligible: hasTravelCover,
  },
  {
    id: "rec_travel_annual_insurance",
    eventType: "frequent_traveller",
    kind: "commercial",
    title: "Annual travel insurance",
    description: "One policy for all your trips this year.",
    icon: "🧳",
    actionLabel: "Learn more",
    eligible: (ctx) => !hasTravelCover(ctx),
  },
];

const strip = ({ eligible: _eligible, ...rec }: CatalogueEntry): Recommendation => rec;

export function recommendationsFor(
  eventType: LifeEventType,
  consent: ConsentLevel,
  ctx: Context,
): Recommendation[] {
  const entries = CATALOGUE.filter((e) => e.eventType === eventType && (e.eligible?.(ctx) ?? true));
  const service = entries.filter((e) => e.kind === "service");
  const commercial = entries.filter((e) => e.kind === "commercial");

  const allowedCommercial =
    consent === "tailored" ? commercial : consent === "basic" ? commercial.slice(0, 1) : [];

  return [...service, ...allowedCommercial].map(strip);
}
