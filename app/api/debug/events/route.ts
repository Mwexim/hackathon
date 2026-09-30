import { z } from "zod";
import { jsonError, noStore } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/session";
import { getCustomer, getEvents, listCustomers } from "@/lib/data/store";
import { scoreCustomer } from "@/lib/detection/detector";
import type { DebugCustomerReport, MathExplanation } from "@/lib/types";

const Query = z.object({ customer: z.string().regex(/^customer_\d{3}$/).optional() });

/**
 * Employee-only detection overview. Disabled entirely in production.
 * ?customer=customer_001 returns the full "Explain the math" breakdown.
 * (Employees may inspect any demo customer; customers can never reach this.)
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") return jsonError(404);
  const s = await getSession();
  if (!s) return jsonError(401);
  if (s.role !== "employee") return jsonError(403);

  const parsed = Query.safeParse({ customer: new URL(req.url).searchParams.get("customer") ?? undefined });
  if (!parsed.success) return jsonError(400);

  if (parsed.data.customer) {
    const c = getCustomer(parsed.data.customer);
    if (!c) return jsonError(404);
    const body: MathExplanation = {
      customerId: c.id,
      customerName: c.name,
      events: scoreCustomer(c.id).map((e) => ({
        type: e.type,
        prior: e.prior,
        priorOdds: e.priorOdds,
        signals: e.signals,
        odds: e.odds,
        confidence: e.confidence,
        tier: e.tier,
      })),
    };
    return noStore(body);
  }

  const reports: DebugCustomerReport[] = listCustomers().map((c) => {
    const events = getEvents(c.id);
    return {
      customerId: c.id,
      customerName: c.name,
      consent: c.consent.marketing,
      scores: scoreCustomer(c.id).map((score) => ({
        type: score.type,
        confidence: score.confidence,
        tier: score.tier,
        evidence: score.evidence,
        status: events.find((e) => e.type === score.type)?.status ?? "below_threshold",
      })),
    };
  });
  return noStore(reports);
}
