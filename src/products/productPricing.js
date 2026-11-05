const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;

/**
 * Single source of truth for the product editor's live pricing/stock preview.
 * In edit mode, totalUnits means units being added (not the final stock target).
 */
export function calculateProductPreview(form, product = null) {
  const existingStock = product ? number(product.stock) : 0;
  const existingCost = product ? number(product.cost) : 0;
  const unitsPerCarton = number(form.unitsPerCarton);
  const typedUnits = String(form.totalUnits ?? '').trim();
  const cartonsUnits = number(form.cartonsPurchased) * unitsPerCarton;
  const incomingUnits = product
    ? (typedUnits !== '' ? number(typedUnits) : cartonsUnits)
    : (typedUnits !== '' ? number(typedUnits) : cartonsUnits);

  const typedUnitCost = String(form.unitCost ?? '').trim();
  const cartonCost = number(form.cartonCost);
  const incomingUnitCost = typedUnitCost !== ''
    ? number(typedUnitCost)
    : (unitsPerCarton > 0 ? cartonCost / unitsPerCarton : 0);

  const resultingStock = existingStock + incomingUnits;
  const unitCost = product
    ? (incomingUnits > 0 && resultingStock > 0
      ? ((existingStock * existingCost) + (incomingUnits * incomingUnitCost)) / resultingStock
      : existingCost)
    : incomingUnitCost;

  const typedSale = String(form.unitSell ?? '').trim();
  const unitSell = typedSale !== ''
    ? number(typedSale)
    : unitCost * (1 + number(form.margin) / 100);
  const profitPercent = unitCost > 0 ? ((unitSell - unitCost) / unitCost) * 100 : 0;

  return {
    existingStock,
    incomingUnits,
    resultingStock,
    incomingUnitCost,
    unitCost,
    unitSell,
    profitPercent,
  };
}
