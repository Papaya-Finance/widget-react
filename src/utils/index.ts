// === Imports ===

import { networks } from "../constants/networks";
import axios from "axios";
// Chain Icons
import BnbIcon from "../assets/chains/bnb.svg";
import PolygonIcon from "../assets/chains/polygon.svg";
// Token Icons
import UsdtIcon from "../assets/tokens/usdt.svg";
import UsdcIcon from "../assets/tokens/usdc.svg";
import { SubscriptionPayCycle } from "../constants/enums";
import { Chain, parseUnits } from "viem";
import * as chains from "viem/chains";
import { signTypedData } from "@wagmi/core";
import { constants, Contract } from "ethers";
import { Signature } from "ethers6";
import {
  buildDataForUSDC,
  buildDataForUSDT,
  compressPermit,
  cutSelector,
  decompressPermit,
} from "./helpers";
import { wagmiConfig } from "../contexts/SubscriptionProvider";

// === Chain Icons Map ===
const chainIcons: Record<string, string> = {
  polygon: PolygonIcon,
  bnb: BnbIcon,
};

// === Token Icons Map ===
const tokenIcons: Record<string, string> = {
  usdt: UsdtIcon,
  usdc: UsdcIcon,
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
    console.warn(`Unsupported chain ID: ${chainId}, defaulting to Polygon`);
    return {
      gasPrice: "0",
      nativeToken: "POL",
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

const gasCostCache: Record<number, { usdValue: string; timestamp: number }> =
  {};

/**
 * Calculates the gas cost for a specific function execution.
 * @param chainId The chain ID of the network.
 * @param estimatedGas The estimated gas units for the function execution.
 * @param cacheDurationMs Caches token price to avoid any rate limit
 * @returns The gas cost in native tokens and USD.
 */
export const fetchGasCost = async (
  chainId: number,
  estimatedGas: bigint,
  cacheDurationMs = 60000 // Cache USD price for 1 minute
): Promise<{ fee: string; usdValue: string } | null> => {
  try {
    const networkFee = await fetchNetworkFee(chainId);
    if (!networkFee) {
      throw new Error("Failed to fetch gas price");
    }

    const { gasPrice, nativeToken } = networkFee;
    if (gasPrice == "0") {
      return { fee: `0.000000000000 ${nativeToken}`, usdValue: "($0.00)" };
    }

    const gasPriceInWei = parseUnits(gasPrice, 9);
    const gasCostInNativeToken = estimatedGas * gasPriceInWei;
    const gasCostInNativeTokenAsNumber = Number(gasCostInNativeToken) / 1e18;

    const fee = `${gasCostInNativeTokenAsNumber.toFixed(12)} ${nativeToken}`;

    const now = Date.now();
    let usdValue = gasCostCache[chainId]?.usdValue || "($0.00)";

    if (
      !gasCostCache[chainId] ||
      now - gasCostCache[chainId].timestamp > cacheDurationMs
    ) {
      const nativeTokenIdMap: Record<number, string> = {
        137: "matic-network",
        56: "binancecoin",
      };

      const tokenId = nativeTokenIdMap[chainId] || "matic-network";
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
      const gasCostInUsd = Number(gasCostInUsdBigInt) / 1e18;

      usdValue = `(~$${gasCostInUsd.toFixed(2)})`;

      gasCostCache[chainId] = { usdValue, timestamp: now };
    }

    return { fee, usdValue };
  } catch (error) {
    console.error("Error calculating gas cost:", error);
    return { fee: "0.000000000000 POL", usdValue: "($0.00)" };
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
    console.warn(`Chain with id ${chainId} not found, defaulting to Polygon`);
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

/**
 * Generates a permit signature (or its compacted version) for USDC or USDT.
 *
 * @param owner - An object with at least an `address` field (e.g. from useAccount).
 * @param permitContract - An ethers.Contract instance for the token’s permit functionality.
 * @param tokenType - A string identifying the token (e.g. "USDC" or "USDT").
 * @param chainId - The chain ID (e.g. 137 for Polygon, 56 for BNB).
 * @param spender - The address that is allowed to spend (e.g. your Papaya contract).
 * @param amount - The amount as a string (used by USDC; ignored for USDT).
 * @param deadline - A deadline timestamp as a string (for USDC: deadline, for USDT: expiry).
 * @param compact - Whether to return a compacted version of the permit (optional).
 *
 * @returns A promise that resolves to a string representing the encoded permit call (with the function selector removed).
 */
export async function getPermit(
  owner: { address: string },
  permitContract: Contract,
  tokenType: string, // Expected to be "USDC" or "USDT" (case‑insensitive)
  chainId: number,
  spender: string,
  amount: string,
  deadline: string,
  compact = false
): Promise<string> {
  // Retrieve the token name and contract address.
  const name = await permitContract.name();
  const verifyingContract = permitContract.address;

  let nonce: any;
  let data: any;

  if (tokenType.toUpperCase() === "USDT") {
    // For USDT, try to use getNonce (or default to 0 if not available).
    try {
      nonce = await permitContract.getNonce(owner.address);
    } catch (error) {
      nonce = 0;
    }
    const nonceStr = nonce.toString();
    data = buildDataForUSDT(
      name,
      tokenType,
      chainId,
      verifyingContract,
      owner.address, // "holder"
      spender,
      nonceStr,
      deadline, // used as expiry
      true // allowed
    );
  } else {
    // For USDC (and similar EIP‑2612 tokens), use nonces.
    try {
      nonce = await permitContract.nonces(owner.address);
    } catch (error) {
      nonce = 0;
    }
    const nonceStr = nonce.toString();
    data = buildDataForUSDC(
      name,
      tokenType,
      chainId,
      verifyingContract,
      owner.address,
      spender,
      amount,
      nonceStr,
      deadline
    );
  }

  // Sign the typed data using Wagmi's signTypedData.
  const signature: string = await signTypedData(wagmiConfig, {
    domain: data.domain,
    types: data.types,
    primaryType: "Permit", // Both schemas use "Permit" as the primary type.
    message: data.message,
  });

  // Split the signature into its v, r, and s components.
  const { v, r, s } = Signature.from(signature);

  let permitCall: string;
  if (tokenType.toUpperCase() === "USDT") {
    // USDT permit: permit(holder, spender, nonce, expiry, allowed, v, r, s)
    permitCall = permitContract.interface.encodeFunctionData("permit", [
      owner.address,
      spender,
      nonce.toString(),
      deadline, // expiry
      true,
      v,
      r,
      s,
    ]);
  } else {
    // USDC permit: permit(owner, spender, value, deadline, v, r, s)
    permitCall = permitContract.interface.encodeFunctionData("permit", [
      owner.address,
      spender,
      amount,
      deadline,
      v,
      r,
      s,
    ]);
  }

  // Remove the 4-byte function selector if required.
  const permitCallNoSelector = cutSelector(permitCall);

  // Optionally compress/decompress the result.
  return compact
    ? compressPermit(permitCallNoSelector)
    : decompressPermit(
        compressPermit(permitCallNoSelector),
        constants.AddressZero, // Replace with your ZERO_ADDRESS constant if available.
        owner.address,
        spender
      );
}
