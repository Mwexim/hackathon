import { jsonError, noStore, requireCustomer } from "@/lib/auth/guards";
import { getCustomer } from "@/lib/data/store";

export async function GET() {
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;
  const customer = getCustomer(auth.customerId);
  return customer ? noStore(customer) : jsonError(404);
}
