// === Imports ===

import { networks } from "../constants/networks";
import axios from "axios";
// Chain Icons
import EthereumIcon from "../assets/chains/ethereum.svg";
import BnbIcon from "../assets/chains/bnb.svg";
import PolygonIcon from "../assets/chains/polygon.svg";
import AvalancheIcon from "../assets/chains/avalanche.svg";
import ArbitrumIcon from "../assets/chains/arbitrum.svg";
import BaseIcon from "../assets/chains/base.svg";
// Not used for now
// import ScrollIcon from "../assets/chains/scroll.svg";
// import ZkSyncIcon from "../assets/chains/zksync.svg";
// import SeiIcon from "../assets/chains/sei.svg";
// import SolanaIcon from "../assets/chains/solana.svg";
// import TonIcon from "../assets/chains/ton.svg";
// Token Icons
import UsdtIcon from "../assets/tokens/usdt.svg";
import UsdcIcon from "../assets/tokens/usdc.svg";
import PyusdIcon from "../assets/tokens/pyusd.svg";
import { SubscriptionPayCycle } from "../constants/enums";
import { Chain, parseUnits } from "viem";
import * as chains from "viem/chains";

// === Chain Icons Map ===
const chainIcons: Record<string, string> = {
  polygon: PolygonIcon,
  bnb: BnbIcon,
  avalanche: AvalancheIcon,
  base: BaseIcon,
  arbitrum: ArbitrumIcon,
  ethereum: EthereumIcon,
};

// === Token Icons Map ===
const tokenIcons: Record<string, string> = {
  usdt: UsdtIcon,
  usdc: UsdcIcon,
  pyusd: PyusdIcon,
};

// === Formatting Utilities ===

/**
 * Format token amounts to a fixed decimal place.
 */
export const formatTokenAmount = (amount: number, decimals = 2): string => {
  return amount.toFixed(decimals);
};

/**
 * Format a price in USD.
 */
export const formatPrice = (price: number): string => {
  return `$${price.toFixed(2)}`;
};

/**
 * Format a network fee with a native token.
 */
export const formatNetworkFee = (fee: number, nativeToken: string): string => {
  return `${fee.toFixed(6)} ${nativeToken}`;
};

// === Asset Management ===

/**
 * Get the icon for a chain or token.
 * @param key - The chain or token name.
 * @param type - Type of asset: "chain" or "token".
 * @returns Icon path or empty string if not found.
 */
export const getAssets = (key: string, type: "chain" | "token"): string => {
  const lowerKey = key.toLowerCase();
  if (type === "chain") {
    return chainIcons[lowerKey] || "";
  } else if (type === "token") {
    return tokenIcons[lowerKey] || "";
  }
  console.error(`Invalid asset type: ${type}`);
  return "";
};

// === API Utilities ===

/**
 * Fetch the price of a native token from CoinGecko.
 */
export const fetchTokenPrice = async (tokenId: string): Promise<number> => {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`;
    const response = await axios.get(url);

    if (response.data[tokenId] && response.data[tokenId].usd) {
      return response.data[tokenId].usd;
    } else {
      throw new Error(`Failed to fetch price for token: ${tokenId}`);
    }
  } catch (error) {
    console.error(`Error fetching token price for ${tokenId}:`, error);
    return 0; // Return 0 as fallback
  }
};

/**
 * Fetches the current gas price for a given chain from MetaMask's Infura Gas API.
 * @param chainId The chain ID of the network.
 * @returns Gas price in Gwei.
 */
export const fetchNetworkFee = async (
  chainId: number
): Promise<{ gasPrice: string; nativeToken: string } | null> => {
  const network = networks.find((n) => n.chainId === chainId);
  if (!network) {
    console.warn(`Unsupported chain ID: ${chainId}, defaulting to Ethereum`);
    return {
      gasPrice: "0",
      nativeToken: "ETH",
    };
  }

  try {
    const url = `https://gas.api.infura.io/v3/9f3e336d09da4444bb0a109b6dc57009/networks/${chainId}/suggestedGasFees`;
    const { data } = await axios.get(url);

    // Extract the medium gas fee estimate
    const mediumGasPrice = data?.medium?.suggestedMaxFeePerGas;
    if (!mediumGasPrice) {
      console.warn("No medium gas price available");
      return null;
    }

    return {
      gasPrice: mediumGasPrice, // Returns Gwei directly
      nativeToken: network.nativeToken,
    };
  } catch (error) {
    console.error("Error fetching gas price from Infura:", error);
    return {
      gasPrice: "0",
      nativeToken: network.nativeToken,
    };
  }
};

/**
 * Calculates the gas cost for a specific function execution.
 * @param chainId The chain ID of the network.
 * @param estimatedGas The estimated gas units for the function execution.
 * @param authToken The authentication token for the API.
 * @param nativeTokenPrice The price of the native token in USD.
 * @returns The gas cost in native tokens and USD.
 */
export const fetchGasCost = async (
  chainId: number,
  estimatedGas: bigint,
  authToken: string
): Promise<{ fee: string; usdValue: string } | null> => {
  try {
    const networkFee = await fetchNetworkFee(chainId, authToken);

    if (!networkFee) {
      throw new Error("Failed to fetch gas price");
    }

    const { gasPrice, nativeToken } = networkFee;

    if (gasPrice == "0") {
      return {
        fee: `0.000000000000 ${nativeToken}`,
        usdValue: "($0.00)",
      };
    }

    const gasPriceInWei = parseUnits(gasPrice, 9);

    const gasCostInNativeToken = estimatedGas * gasPriceInWei;

    const nativeTokenIdMap: Record<number, string> = {
      137: "matic-network",
      43114: "avalanche-2",
      8453: "ethereum",
      42161: "ethereum",
      1: "ethereum",
    };

    const tokenId = nativeTokenIdMap[chainId] || "ethereum";
    if (!tokenId) {
      throw new Error(`Token ID not found for chain ID: ${chainId}`);
    }

    const rawNativeTokenPrice = await fetchTokenPrice(tokenId);

    const nativeTokenPriceInWei = parseUnits(
      rawNativeTokenPrice.toString(),
      18
    );

    const gasCostInUsdBigInt =
      (gasCostInNativeToken * nativeTokenPriceInWei) / BigInt(1e18);

    const gasCostInNativeTokenAsNumber = Number(gasCostInNativeToken) / 1e18;

    const gasCostInUsd = Number(gasCostInUsdBigInt) / 1e18;

    return {
      fee: `${gasCostInNativeTokenAsNumber.toFixed(12)} ${nativeToken}`,
      usdValue: `(~$${gasCostInUsd.toFixed(2)})`,
    };
  } catch (error) {
    console.error("Error calculating gas cost:", error);
    return {
      fee: "0.000000000000 ETH",
      usdValue: "($0.00)",
    };
  }
};

/**
 * Returns the Papaya contract address for a specific chain.
 * @param chainId - The chain ID of the connected blockchain network.
 * @returns Papaya contract address as a string or null if not found.
 */
export const getPapayaAddress = (chainId: number): string | null => {
  // Find the network object corresponding to the provided chain ID
  const network = networks.find((n) => n.chainId === chainId);

  if (!network) {
    console.error(`Unsupported chain ID: ${chainId}`);
    return null;
  }

  // Find the first Papaya contract address from the tokens in the network
  const papayaAddress = network.tokens?.[0]?.papayaAddress;

  if (!papayaAddress) {
    console.error(`No Papaya contract address found for chain ID: ${chainId}`);
    return null;
  }

  return papayaAddress;
};

/**
 * Calculate the subscription rate based on the period and per-second rate.
 * @param cost - The rate per second (BigNumber or string with 18 decimals).
 * @param payCycle - The payment cycle ("daily", "weekly", "monthly", "yearly").
 * @returns The calculated subscription rate for the given pay cycle as a BigNumber.
 */
export const calculateSubscriptionRate = (
  subscriptionCost: string | bigint,
  payCycle: SubscriptionPayCycle
): bigint => {
  // Convert the rate to a BigNumber if it's not already
  const cost = BigInt(subscriptionCost);

  // Define time durations in seconds
  const timeDurations: Record<SubscriptionPayCycle, bigint> = {
    "/daily": BigInt(24 * 60 * 60), // 1 day = 24 hours * 60 minutes * 60 seconds
    "/weekly": BigInt(7 * 24 * 60 * 60), // 7 days
    "/monthly": BigInt(30 * 24 * 60 * 60), // 30 days
    "/yearly": BigInt(365 * 24 * 60 * 60), // 365 days
  };

  // Multiply the per-second rate by the duration to get the total rate
  return cost / timeDurations[payCycle];
};

export const getChain = (chainId: number): Chain => {
  const chain = Object.values(chains).find((c) => c.id === chainId);
  if (!chain) {
    console.warn(`Chain with id ${chainId} not found, defaulting to Ethereum`);
    return chains.mainnet;
  }
  return chain;
};

export const getReadableErrorMessage = (error: any): string => {
  if (!error || typeof error !== "object") {
    return "An unknown error occurred.";
  }

  if (error.message?.includes("User rejected the request")) {
    return "The transaction was rejected by the user.";
  }

  if (error.message?.includes("insufficient funds")) {
    return "The account has insufficient funds to complete this transaction.";
  }

  if (error.message?.includes("gas required exceeds allowance")) {
    return "The transaction requires more gas than allowed.";
  }

  if (error.message?.includes("execution reverted")) {
    return "The transaction was reverted by the contract. Check the input or contract state.";
  }

  if (error.message?.includes("network error")) {
    return "A network error occurred. Please check your internet connection.";
  }

  if (error.message?.includes("chain mismatch")) {
    return "You are connected to the wrong network. Please switch to the correct chain.";
  }

  if (error.message?.includes("invalid address")) {
    return "An invalid address was provided. Please check the input.";
  }

  if (error.message?.includes("unsupported ABI")) {
    return "The provided ABI is not supported.";
  }

  if (error.message?.includes("provider error")) {
    return "An error occurred with the wallet provider. Please try again.";
  }

  if (error.message?.includes("contract not deployed")) {
    return "The contract is not deployed on the selected network.";
  }

  if (error.message?.includes("max nonce")) {
    return "The nonce for the transaction exceeds the allowed limit.";
  }

  if (error.message?.includes("invalid signature")) {
    return "The transaction signature is invalid. Please try signing again.";
  }

  if (error.message?.includes("timeout")) {
    return "The transaction request timed out. Please try again.";
  }

  if (error.message?.includes("failed to fetch")) {
    return "Failed to connect to the blockchain. Please check your network and try again.";
  }

  if (error.message?.includes("call exception")) {
    return "A call exception occurred. The contract may not support the called function.";
  }

  if (error.message?.includes("unknown error")) {
    return "An unknown error occurred. Please try again later.";
  }

  // Default fallback for unhandled cases
  return "An error occurred during the transaction. Please check the details and try again.";
};
