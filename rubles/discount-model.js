globalThis.DiscountModel = (() => {
  const anchors = [
    { price: 300, minimum: 30, maximum: 210 },
    { price: 400, minimum: 30, maximum: 280 },
    { price: 500, minimum: 30, maximum: 350 },
    { price: 900, minimum: 50, maximum: 600 },
    { price: 1500, minimum: 50, maximum: 660 },
    { price: 5000, minimum: 110, maximum: 1150 },
    { price: 10000, minimum: 110, maximum: 1230 },
    { price: 70000, minimum: 310, maximum: 4600 }
  ];
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  function limits(price) {
    if (price <= anchors[0].price) {
      return { minimum: Math.min(30, Math.floor(price * 0.7)), maximum: Math.floor(price * 0.7) };
    }
    const upperIndex = anchors.findIndex(anchor => price <= anchor.price);
    if (upperIndex < 0) return { minimum: 310, maximum: 4600 };
    const lower = anchors[upperIndex - 1];
    const upper = anchors[upperIndex];
    const progress = (price - lower.price) / (upper.price - lower.price);
    return {
      minimum: Math.ceil(lower.minimum + (upper.minimum - lower.minimum) * progress),
      maximum: Math.floor(lower.maximum + (upper.maximum - lower.maximum) * progress)
    };
  }
  function calculate(item, mode) {
    const percent = mode === 'ai' ? item.recommendedPercent : Number(mode);
    if (!Number.isFinite(percent) || percent < 1 || percent > 100) return null;
    const { minimum, maximum } = limits(item.price);
    const requestedAmount = Math.round(item.price * percent / 100);
    const amount = clamp(requestedAmount, minimum, maximum);
    return { amount, requestedAmount, requestedPercent: percent, effectivePercent: amount / item.price * 100, minimum, maximum, limited: amount !== requestedAmount };
  }
  return Object.freeze({ anchors, limits, calculate });
})();
