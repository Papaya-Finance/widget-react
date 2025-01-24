export const formatTokenAmount = (amount: number, decimals = 2): string => {
  return amount.toFixed(decimals);
};

export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

export const formatNetworkFee = (fee: number): string => {
  return `${fee.toFixed(6)} MATIC`;
};
