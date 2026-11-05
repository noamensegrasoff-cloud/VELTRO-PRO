const number = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const hasValue = value => String(value ?? '').trim() !== '';

/**
 * Preview-only calculator. Existing values remain visible until the user
 * enters new purchase quantity/cost or changes the sale price.
 */
export function calculateProductPreview(form, product = null) {
  const existingStock = product ? number(product.stock) : 0;
  const existingCost = product ? number(product.cost) : 0;
  const existingSell = product ? number(product.sell) : 0;
  const unitsPerCarton = number(form.unitsPerCarton);
  const typedUnits = hasValue(form.totalUnits) ? number(form.totalUnits) : null;
  const incomingUnits = typedUnits !== null
    ? typedUnits
    : number(form.cartonsPurchased) * unitsPerCarton;

  const incomingUnitCost = hasValue(form.unitCost)
    ? number(form.unitCost)
    : (unitsPerCarton > 0 ? number(form.cartonCost) / unitsPerCarton : existingCost);

  const resultingStock = existingStock + incomingUnits;
  const unitCost = product
    ? (incomingUnits > 0 && resultingStock > 0
      ? ((existingStock * existingCost) + (incomingUnits * incomingUnitCost)) / resultingStock
      : existingCost)
    : incomingUnitCost;

  const unitSell = hasValue(form.unitSell)
    ? number(form.unitSell)
    : (product ? existingSell : unitCost * (1 + number(form.margin) / 100));

  const salePriceChanged = !!product && unitSell !== existingSell;
  const purchaseChanged = incomingUnits > 0;
  const profitPercent = product && !purchaseChanged && !salePriceChanged
    ? number(product.margin)
    : (unitCost > 0 ? ((unitSell - unitCost) / unitCost) * 100 : 0);

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
