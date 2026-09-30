import { z } from "zod";
import { jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { getTransactions } from "@/lib/data/store";

const Query = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export async function GET(req: Request) {
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;

  const params = new URL(req.url).searchParams;
  const parsed = Query.safeParse({ limit: params.get("limit") ?? undefined });
  if (!parsed.success) return jsonError(400);

  return noStore(getTransactions(auth.customerId, parsed.data.limit));
}
