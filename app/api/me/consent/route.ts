import { z } from "zod";
import { isSameOrigin, jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { updateConsent } from "@/lib/data/store";

const Body = z
  .object({
    marketing: z.enum(["none", "basic", "tailored"]).optional(),
    proactivityLevel: z.enum(["low", "medium", "high"]).optional(),
  })
  .strict()
  .refine((b) => b.marketing !== undefined || b.proactivityLevel !== undefined);

/** Updates the session customer's own consent settings. */
export async function PATCH(req: Request) {
  if (!isSameOrigin(req)) return jsonError(403);
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400);

  const customer = updateConsent(auth.customerId, parsed.data);
  return customer ? noStore(customer) : jsonError(404);
}
