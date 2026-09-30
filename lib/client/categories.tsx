import {
  Baby,
  Briefcase,
  Bus,
  HeartPulse,
  House,
  Landmark,
  Pill,
  Plane,
  Receipt,
  ShoppingCart,
  Sofa,
  Truck,
  Tv,
  Users,
  Utensils,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { MerchantCategory } from "@/lib/types";

export const CATEGORY_META: Record<MerchantCategory, { label: string; icon: LucideIcon }> = {
  salary: { label: "Income", icon: Briefcase },
  rent: { label: "Housing", icon: House },
  utilities: { label: "Utilities", icon: Zap },
  groceries: { label: "Groceries", icon: ShoppingCart },
  furniture: { label: "Home & furniture", icon: Sofa },
  moving: { label: "Moving", icon: Truck },
  hospital: { label: "Health", icon: HeartPulse },
  pharmacy: { label: "Health", icon: Pill },
  baby: { label: "Baby", icon: Baby },
  childcare: { label: "Childcare", icon: Users },
  child_benefit: { label: "Benefits", icon: Landmark },
  travel: { label: "Travel", icon: Plane },
  restaurants: { label: "Restaurants", icon: Utensils },
  subscriptions: { label: "Subscriptions", icon: Tv },
  transport: { label: "Transport", icon: Bus },
  other: { label: "Other", icon: Receipt },
};

export function CategoryIcon({ category }: { category: MerchantCategory }) {
  const Icon = CATEGORY_META[category].icon;
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-canvas text-muted">
      <Icon size={18} strokeWidth={2} aria-hidden />
    </span>
  );
}
