// The price list. The server charges from this file only — never from what the browser sends.

export type ProductId = "pack10" | "pro30" | "business30";

export type Product = {
  id: ProductId;
  priceIls: number; // VAT included
  credits: number;
  /** Days of Pro features (4K output, batch AI). 0 = credits only. */
  proDays: number;
};

export const PRODUCTS: Record<ProductId, Product> = {
  pack10: { id: "pack10", priceIls: 39, credits: 10, proDays: 0 },
  pro30: { id: "pro30", priceIls: 89, credits: 60, proDays: 30 },
  business30: { id: "business30", priceIls: 349, credits: 300, proDays: 30 },
};

export const SIGNUP_BONUS = 3;

/** Credits each AI tool costs. */
export const TOOL_COST = { stage: 1, declutter: 1, refresh: 1, sky: 1, erase: 1, upscale: 1 } as const;

export function perCredit(p: Product) {
  return Math.round((p.priceIls / p.credits) * 100) / 100;
}
