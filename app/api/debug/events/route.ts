import { jsonError, noStore } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { getEvents, listCustomers } from "@/lib/data/store";
import { scoreCustomer } from "@/lib/detection/detector";
import type { DebugCustomerReport } from "@/lib/types";

/** Employee-only detection overview. Disabled entirely in production. */
export async function GET() {
  if (process.env.NODE_ENV === "production") return jsonError(404);
  const s = await getSession();
  if (!s) return jsonError(401);
  if (s.role !== "employee") return jsonError(403);

  const reports: DebugCustomerReport[] = listCustomers().map((c) => {
    const events = getEvents(c.id);
    return {
      customerId: c.id,
      customerName: c.name,
      consent: c.consent.marketing,
      scores: scoreCustomer(c.id).map((score) => ({
        ...score,
        status: events.find((e) => e.type === score.type)?.status ?? "below_threshold",
      })),
    };
  });

  return noStore(reports);
}
