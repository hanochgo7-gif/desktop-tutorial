(function (root) {
  'use strict';
  const validId = (v) =>
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= 200 &&
    !['__proto__', 'prototype', 'constructor'].includes(v);
  const money = (v) => Number.isSafeInteger(v) && v >= 0;
  function promotionEligible(p) {
    return (
      !!p &&
      !['p174', 'p175'].includes(p.id) &&
      p.buy !== false &&
      !/מידע בלבד|עישון|אלכוהול|טבק|ניקוטין|סיגר|אידוי|tobacco|nicotine|vape|vaping/i.test(
        [p.category, p.name].join(' '),
      )
    );
  }
  function validatePromotion(value, p) {
    if (value === undefined) return undefined;
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).sort().join(',') !== 'enabled,quantity,totalPriceMinor,type' ||
      value.type !== 'quantity_fixed_total' ||
      typeof value.enabled !== 'boolean' ||
      !Number.isSafeInteger(value.quantity) ||
      value.quantity < 2 ||
      !money(value.totalPriceMinor)
    )
      throw Error('מבצע דורש כמות שלמה של 2 ומעלה ומחיר כולל תקין ולא שלילי.');
    if (!promotionEligible(p)) throw Error('מבצע לפי כמות אינו זמין למוצר זה.');
    return {
      type: value.type,
      quantity: value.quantity,
      totalPriceMinor: value.totalPriceMinor,
      enabled: value.enabled,
    };
  }
  function promotionText(value) {
    return value?.enabled
      ? 'מבצע ' +
          value.quantity +
          ' ב־' +
          (Math.floor(value.totalPriceMinor / 100) +
            (value.totalPriceMinor % 100
              ? '.' + String(value.totalPriceMinor % 100).padStart(2, '0')
              : '')) +
          ' ₪'
      : 'ללא מבצע';
  }
  function lineTotal(p, quantity, currency) {
    const unit = priceMinor(p, currency);
    if (unit === null || !Number.isSafeInteger(quantity) || quantity < 1) return null;
    let promotion;
    try {
      promotion = validatePromotion(p.promotion, p);
    } catch {
      return null;
    }
    const groups = promotion?.enabled ? Math.floor(quantity / promotion.quantity) : 0,
      remainder = groups ? quantity % promotion.quantity : quantity;
    const grouped = groups * (promotion?.totalPriceMinor || 0),
      remaining = remainder * unit,
      total = grouped + remaining;
    return money(grouped) && money(remaining) && money(total)
      ? { unitPriceMinor: unit, quantity, groups, totalMinor: total }
      : null;
  }
  function parseMoney(value) {
    const s = String(value ?? '').trim();
    if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(s)) return null;
    const [a, b = ''] = s.split('.');
    const n = Number(a) * 100 + Number(b.padEnd(2, '0'));
    return money(n) ? n : null;
  }
  function priceMinor(p, currency) {
    if (
      currency !== 'ILS' ||
      p?.buy !== true ||
      p.availability === 'out_of_stock' ||
      !['verified', 'owner-configured'].includes(p.priceReview?.status) ||
      !Number.isFinite(p.price) ||
      p.price < 0
    )
      return null;
    return parseMoney(p.price);
  }
  const available = (p) => p && p.buy === true && p.availability !== 'out_of_stock';
  function cleanLines(lines, products) {
    const byId = new Map(products.map((p) => [p.id, p])),
      out = new Map();
    for (const line of Array.isArray(lines) ? lines : []) {
      if (
        !line ||
        !available(byId.get(line.productId)) ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity < 1 ||
        line.quantity > 999
      )
        continue;
      out.set(line.productId, Math.min(999, (out.get(line.productId) || 0) + line.quantity));
    }
    return [...out].map(([productId, quantity]) => ({ productId, quantity }));
  }
  function total(lines, products, currency) {
    const map = new Map(products.map((p) => [p.id, p]));
    let n = 0;
    for (const l of lines) {
      const line = lineTotal(map.get(l.productId), l.quantity, currency);
      if (!line) return null;
      n += line.totalMinor;
      if (!money(n)) return null;
    }
    return n;
  }
  function suggestBudget(products, budget, config, random = Math.random) {
    const b = config.budget;
    if (!b.enabled || !money(budget) || budget < 1 || budget > b.maxMinor)
      return { status: 'invalid_budget', lines: [], totalMinor: 0, remainingMinor: budget };
    const pool = products
      .filter((p) => b.categories.includes(p.category))
      .map((p) => ({ p, cost: priceMinor(p, config.currency) }))
      .filter((x) => x.cost !== null && x.cost > 0 && x.cost <= budget);
    if (!pool.length)
      return { status: 'no_verified_prices', lines: [], totalMinor: 0, remainingMinor: budget };
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const r = random();
      const j = Math.floor(
        (Number.isFinite(r) ? Math.max(0, Math.min(0.999999999, r)) : 0) * (i + 1),
      );
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let remaining = budget,
      count = 0;
    const quantities = new Map();
    const add = (x) => {
      quantities.set(x.p.id, (quantities.get(x.p.id) || 0) + 1);
      remaining -= x.cost;
      count++;
    };
    // One affordable item per category first; then fill the gap without exceeding it.
    for (const cat of b.categories) {
      const x = shuffled.find((x) => x.p.category === cat && x.cost <= remaining);
      if (x && count < b.maxItems) add(x);
    }
    while (count < b.maxItems) {
      const fits = shuffled.filter(
        (x) => x.cost <= remaining && (quantities.get(x.p.id) || 0) < b.maxPerProduct,
      );
      if (!fits.length) break;
      fits.sort((a, b) => b.cost - a.cost);
      add(fits[0]);
    }
    return {
      status: 'ok',
      lines: [...quantities].map(([productId, quantity]) => ({ productId, quantity })),
      totalMinor: budget - remaining,
      remainingMinor: remaining,
    };
  }
  function purchaseInsights(orders, products) {
    const completed = (Array.isArray(orders) ? orders : []).filter(
      (o) => validId(o?.id) && o.status === 'completed' && Array.isArray(o.items),
    );
    const seen = new Set(),
      unique = completed.filter((o) => {
        if (seen.has(o.id)) return false;
        seen.add(o.id);
        return true;
      });
    const counts = new Map();
    for (const o of unique)
      for (const l of cleanLines(o.items, products))
        counts.set(l.productId, (counts.get(l.productId) || 0) + l.quantity);
    return {
      orders: unique,
      frequent: [...counts]
        .sort((a, b) => b[1] - a[1])
        .map(([productId, quantity]) => ({ productId, quantity })),
    };
  }
  const deny = (reason) => ({ eligible: false, reason });
  function completedOrder(o) {
    return (
      validId(o?.id) &&
      validId(o.customerId) &&
      o.status === 'completed' &&
      o.paymentStatus === 'paid' &&
      money(o.paidMerchandiseMinor) &&
      Array.isArray(o.appliedBenefits)
    );
  }
  const hasBenefit = (order, state) =>
    order.appliedBenefits.length > 0 || (state.orderBenefits?.[order.id] || []).length > 0;
  function welcomeEligibility(customer, order, state, c) {
    if (!c.welcome.enabled) return deny('disabled');
    if (!customer?.authenticated || !validId(customer.id) || customer.welcomeEligible !== true)
      return deny('customer_ineligible');
    if (
      !completedOrder(order) ||
      order.customerId !== customer.id ||
      !money(order.merchandiseSubtotalMinor)
    )
      return deny('order_ineligible');
    if (
      !money(c.welcome.minimumOrderMinor) ||
      !money(c.welcome.amountMinor) ||
      c.welcome.amountMinor === 0
    )
      return deny('configuration_missing');
    if (order.merchandiseSubtotalMinor < c.welcome.minimumOrderMinor) return deny('below_minimum');
    if (state.welcomeClaims?.[customer.id]) return deny('already_redeemed');
    if (hasBenefit(order, state)) return deny('stacking_not_allowed');
    return {
      eligible: true,
      amountMinor: Math.min(c.welcome.amountMinor, order.merchandiseSubtotalMinor),
    };
  }
  function referralEligibility(relation, order, state, c) {
    if (!c.referral.enabled) return deny('disabled');
    if (!money(c.referral.minimumOrderMinor)) return deny('threshold_not_configured');
    if (
      !validId(relation?.id) ||
      !validId(relation.referrerId) ||
      !validId(relation.referredId) ||
      relation.referrerId === relation.referredId ||
      relation.verified !== true
    )
      return deny('invalid_relationship');
    if (!completedOrder(order) || order.customerId !== relation.referredId)
      return deny('order_ineligible');
    if (c.referral.requireFirstCompletedOrder && order.isFirstCompletedOrder !== true)
      return deny('not_first_order');
    if (order.paidMerchandiseMinor < c.referral.minimumOrderMinor) return deny('below_minimum');
    if (state.referralClaims?.[relation.referredId]) return deny('already_rewarded');
    if (hasBenefit(order, state)) return deny('stacking_not_allowed');
    if (!money(c.referral.rewardMinor) || c.referral.rewardMinor === 0)
      return deny('configuration_missing');
    return { eligible: true, amountMinor: c.referral.rewardMinor };
  }
  function eligiblePrizes(products, state, c) {
    const map = new Map(products.map((p) => [p.id, p]));
    const ids = new Set();
    return c.wheel.prizes.filter((p) => {
      if (!p || ids.has(p.productId)) return false;
      ids.add(p.productId);
      return (
        p.enabled === true &&
        p.availability === 'available' &&
        available(map.get(p.productId)) &&
        validId(p.displayName) &&
        Number.isFinite(p.weight) &&
        p.weight > 0 &&
        (p.maxRedemptions === null ||
          p.maxRedemptions === undefined ||
          (Number.isSafeInteger(p.maxRedemptions) &&
            p.maxRedemptions > 0 &&
            (state.prizeCounts?.[p.productId] || 0) < p.maxRedemptions))
      );
    });
  }
  function wheelEligibility(customer, order, state, products, c) {
    if (!c.wheel.enabled) return deny('disabled');
    if (!customer?.authenticated || !completedOrder(order) || customer.id !== order.customerId)
      return deny('order_ineligible');
    if (!money(c.wheel.minimumOrderMinor)) return deny('configuration_missing');
    if (order.paidMerchandiseMinor < c.wheel.minimumOrderMinor) return deny('below_minimum');
    if (state.spins?.[order.id]) return deny('already_spun');
    if (!c.stacking.wheelWithMonetaryBenefit && hasBenefit(order, state))
      return deny('stacking_not_allowed');
    if (!eligiblePrizes(products, state, c).length) return deny('no_prizes');
    return { eligible: true };
  }
  function choosePrize(prizes, random) {
    if (!prizes.length) throw Error('no_prizes');
    const sum = prizes.reduce((a, p) => a + p.weight, 0),
      r = random();
    if (!Number.isFinite(sum) || sum <= 0 || !Number.isFinite(r) || r < 0 || r >= 1)
      throw Error('invalid_random_or_weights');
    let cursor = r * sum;
    for (const p of prizes) {
      cursor -= p.weight;
      if (cursor < 0) return p;
    }
    return prizes.at(-1);
  }
  // Server-side reference. transaction MUST provide durable atomic commit/rollback across all keys.
  // Never call this with browser storage for production redemption.
  function createRewardService({ store, products, config, random }) {
    if (typeof store?.transaction !== 'function' || typeof random !== 'function')
      throw Error('durable_store_and_server_rng_required');
    const commit = (fn) =>
      store.transaction((state) => {
        for (const k of [
          'welcomeClaims',
          'referralClaims',
          'spins',
          'prizeCounts',
          'redemptions',
          'orderBenefits',
        ])
          state[k] ??= Object.create(null);
        return fn(state);
      });
    return {
      redeemWelcome: (customer, order) =>
        commit((s) => {
          const e = welcomeEligibility(customer, order, s, config);
          if (!e.eligible) throw Error(e.reason);
          const award = {
            id: 'welcome:' + customer.id,
            customerId: customer.id,
            orderId: order.id,
            amountMinor: e.amountMinor,
            type: 'welcome',
          };
          s.welcomeClaims[customer.id] = award;
          s.orderBenefits[order.id] = ['welcome'];
          return { ...award };
        }),
      rewardReferral: (relation, order) =>
        commit((s) => {
          const e = referralEligibility(relation, order, s, config);
          if (!e.eligible) throw Error(e.reason);
          const award = {
            id: 'referral:' + relation.referredId,
            customerId: relation.referrerId,
            orderId: order.id,
            amountMinor: e.amountMinor,
            type: 'referral',
          };
          s.referralClaims[relation.referredId] = award;
          s.orderBenefits[order.id] = ['referral'];
          return { ...award };
        }),
      spin: (customer, order) =>
        commit((s) => {
          const e = wheelEligibility(customer, order, s, products, config);
          if (!e.eligible) throw Error(e.reason);
          const p = choosePrize(eligiblePrizes(products, s, config), random);
          const award = {
            id: 'spin:' + order.id,
            customerId: customer.id,
            orderId: order.id,
            productId: p.productId,
            quantity: 1,
            unitPriceMinor: 0,
            status: 'awarded',
            label: '🎁 זכייה בגלגל Allenbis',
          };
          s.spins[order.id] = award;
          s.prizeCounts[p.productId] = (s.prizeCounts[p.productId] || 0) + 1;
          s.orderBenefits[order.id] = [...(s.orderBenefits[order.id] || []), 'wheel'];
          return { ...award };
        }),
      redeemPrize: (customer, awardId, targetOrder) =>
        commit((s) => {
          const award = Object.values(s.spins).find((x) => x.id === awardId);
          if (
            !award ||
            award.customerId !== customer.id ||
            !customer.authenticated ||
            targetOrder?.customerId !== customer.id ||
            !validId(targetOrder.id) ||
            targetOrder.status !== 'checkout'
          )
            throw Error('invalid_redemption');
          if (s.redemptions[awardId]) throw Error('already_redeemed');
          s.redemptions[awardId] = { orderId: targetOrder.id, customerId: customer.id };
          return { ...award, status: 'redeemed', redemptionOrderId: targetOrder.id };
        }),
    };
  }
  function referralLink(code, c) {
    if (!/^[A-Za-z0-9_-]{6,80}$/.test(code || '') || !c.referralBaseUrl) return null;
    try {
      const u = new URL(c.referralBaseUrl);
      if (u.protocol !== 'https:') return null;
      u.searchParams.set('ref', code);
      return u.href;
    } catch {
      return null;
    }
  }
  const api = {
    parseMoney,
    priceMinor,
    cleanLines,
    total,
    lineTotal,
    promotionEligible,
    validatePromotion,
    promotionText,
    suggestBudget,
    purchaseInsights,
    welcomeEligibility,
    referralEligibility,
    wheelEligibility,
    eligiblePrizes,
    choosePrize,
    createRewardService,
    referralLink,
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AllenbisCommerce = Object.freeze(api);
})(typeof window === 'object' ? window : globalThis);
