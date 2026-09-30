import { noStore, requireCustomer } from "@/lib/auth/guards";
import { getEvents } from "@/lib/data/store";

export async function GET() {
  const auth = await requireCustomer();
  if ("response" in auth) return auth.response;
  return noStore(getEvents(auth.customerId));
}
