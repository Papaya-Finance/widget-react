export const getAssets = (key: string, type: string): string => {
  try {
    if (type === "chain") {
      return new URL(`../assets/chains/${key}.svg`, import.meta.url).href;
    } else if (type === "token") {
      return new URL(`../assets/tokens/${key}.svg`, import.meta.url).href;
    }
    throw new Error("Invalid asset type. Must be 'chain' or 'token'.");
  } catch (error) {
    console.error(`Error fetching asset for key: ${key}, type: ${type}`, error);
    return "";
  }
};
