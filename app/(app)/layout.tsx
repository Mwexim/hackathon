import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PhoneFrame } from "@/components/PhoneFrame";
import { getSession } from "@/lib/auth/session";
import { getCustomer } from "@/lib/data/store";

/** Customer area: requires a customer session (checked server-side). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.role !== "customer") redirect("/employee");
  const customer = getCustomer(s.customerId);
  if (!customer) redirect("/login");

  return (
    <PhoneFrame>
      <AppHeader name={customer.name} />
      <main className="flex-1 px-4 pb-8 pt-5">{children}</main>
      <BottomNav />
    </PhoneFrame>
  );
}
