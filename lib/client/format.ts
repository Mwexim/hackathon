import type { LifeEventType } from "@/lib/types";

const eur = new Intl.NumberFormat("en-BE", { style: "currency", currency: "EUR" });

export const formatEUR = (n: number) => eur.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export const EVENT_LABELS: Record<LifeEventType, string> = {
  moved_house: "Moving house",
  new_baby: "A new family member",
  frequent_traveller: "Travelling more",
};
