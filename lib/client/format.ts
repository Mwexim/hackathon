import type { LifeEventType } from "@/lib/types";

const eur = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });

export const formatEUR = (n: number) => eur.format(n);

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export const formatDayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

export const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export const formatPercent = (n: number) => `${Math.round(n * 100)}%`;

/** A detection is never a certainty: display at most 99%. */
export const formatLikelihood = (n: number) => `${Math.min(99, Math.round(n * 100))}%`;

export const EVENT_LABELS: Record<LifeEventType, string> = {
  moved_house: "Moving house",
  new_baby: "A new family member",
  frequent_traveller: "Travelling more",
};
