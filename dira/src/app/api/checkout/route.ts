import { z } from "zod";
import { HttpError, requireUser } from "@/lib/server/auth";
import { paymentsMode, siteUrl } from "@/lib/server/config";
import { handle, json } from "@/lib/server/http";
import { createGrowPayment } from "@/lib/server/payments/grow";
import { limit } from "@/lib/server/rate-limit";
import { getStore } from "@/lib/server/store";
import { PRODUCTS, type ProductId } from "@/lib/plans";

const Body = z.object({ product: z.enum(Object.keys(PRODUCTS) as [ProductId, ...ProductId[]]), lang: z.enum(["he", "en"]).default("he") });

// Starts a purchase. The price and credits come from the server's price list only.
export async function POST(req: Request) {
  return handle(async () => {
    const mode = paymentsMode();
    if (!mode) throw new HttpError(503, "payments_off");
    const user = await requireUser(req);
    limit("checkout", user.id);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, "bad_product");
    const product = PRODUCTS[parsed.data.product];
    const store = getStore();
    const purchase = await store.createPurchase({
      user_id: user.id,
      product: product.id,
      amount_ils: product.priceIls,
      credits: product.credits,
      pro_days: product.proDays,
      provider: mode,
      process_token: null,
    });
    const origin = siteUrl(req);
    if (mode === "mock") return json({ url: `/${parsed.data.lang}/pay/mock/${purchase.id}` });
    const names: Record<ProductId, string> = { pack10: "Dira Ready 10 credits", pro30: "Dira Ready Pro 30 days", business30: "Dira Ready Business 30 days" };
    try {
      const pay = await createGrowPayment(purchase, user.email, names[product.id], origin, parsed.data.lang);
      await store.setPurchaseToken(purchase.id, pay.processToken);
      return json({ url: pay.url });
    } catch (e) {
      console.error("grow create failed", purchase.id, e);
      throw new HttpError(502, "payment_start_failed");
    }
  });
}
