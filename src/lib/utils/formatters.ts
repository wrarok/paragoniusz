export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function parseAmount(amountString: string): number {
  const parsed = parseFloat(amountString);
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateTotal(amounts: string[]): number {
  return amounts.reduce((sum, amount) => sum + parseAmount(amount), 0);
}

export function formatExpenseCount(count: number): string {
  if (count === 1) {
    return "1 wydatek";
  }
  if (count >= 2 && count <= 4) {
    return `${count} wydatki`;
  }
  return `${count} wydatków`;
}
