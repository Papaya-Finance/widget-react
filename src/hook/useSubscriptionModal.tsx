import { useReadContract } from "wagmi";
import { estimateGas } from "@wagmi/core";
import { SubscriptionDetails } from "../types";
import { Abi, Address, encodeFunctionData, parseUnits } from "viem";
import { networks } from "../constants/networks";
import { USDT } from "../contracts/evm/USDT";
import { USDC } from "../contracts/evm/USDC";
import { useEffect, useMemo, useState } from "react";
import { calculateSubscriptionRate, fetchGasCost, getAssets } from "../utils";
import {
  CaipNetwork,
  UseAppKitAccountReturn,
  UseAppKitNetworkReturn,
} from "@reown/appkit";
import { polygon } from "viem/chains";
import { Papaya } from "../contracts/evm/Papaya";
import { wagmiConfig } from "../contexts/SubscriptionProvider";

export const useTokenDetails = (
  network: UseAppKitNetworkReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const defaultNetwork = networks.find((n) => n.chainId === 137);
  if (!defaultNetwork || !defaultNetwork.tokens) {
    throw new Error(
      "Default network (Polygon) is missing in the configuration."
    );
  }

  const defaultToken = defaultNetwork.tokens.find(
    (t) => t.name.toLowerCase() === "usdt"
  );
  if (!defaultToken) {
    throw new Error("Default token (USDT) is missing in the configuration.");
  }

  const currentNetwork =
    networks.find((n) => n.chainId === network.chainId) ?? defaultNetwork;

  const tokenDetails =
    currentNetwork.tokens.find(
      (t) => t.name.toLowerCase() === subscriptionDetails.token.toLowerCase()
    ) ?? defaultToken;

  // Detect unsupported network or token
  const isUnsupportedNetwork = !currentNetwork; // No matching network found
  const isUnsupportedToken = !tokenDetails; // No matching token found

  return {
    currentNetwork,
    tokenDetails,
    isUnsupportedNetwork,
    isUnsupportedToken,
  };
};

export const useContractData = (
  contractAddress: Address,
  abi: any,
  functionName: string,
  args: any[],
  refetchInterval: number = 1000
) => {
  const { data } = useReadContract({
    address: contractAddress,
    abi,
    functionName,
    args,
    query: {
      enabled: !!contractAddress,
      refetchInterval,
      refetchIntervalInBackground: true,
    },
  });
  return data ? BigInt(data.toString()) : null;
};

export const getTokenABI = (tokenName: string) => {
  switch (tokenName.toUpperCase()) {
    case "USDT":
      return USDT;
    case "USDC":
      return USDC;
    default:
      return USDT;
  }
};

export const useNetworkFee = (
  open: boolean,
  account: UseAppKitAccountReturn,
  chainId: number,
  functionDetails: {
    abi: Abi;
    address: Address;
    functionName: string;
    args: any[];
    account: Address;
  }
) => {
  const [networkFee, setNetworkFee] = useState<{
    fee: string;
    usdValue: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const memoizedAccount = useMemo(
    () => ({
      ...account,
    }),
    [account.address, account.status]
  );

  useEffect(() => {
    let isMounted = true;

    const fetchFee = async () => {
      if (!open || !memoizedAccount?.address) return;

      try {
        setIsLoading(true);

        if (!wagmiConfig) {
          console.warn("Wagmi is not properly configured.");
          setNetworkFee({ fee: "0.000000000000 POL", usdValue: "($0.00)" });
          return;
        }

        const estimatedGas = await estimateGas(wagmiConfig, {
          to: functionDetails.address,
          data: encodeFunctionData({
            abi: functionDetails.abi,
            functionName: functionDetails.functionName,
            args: functionDetails.args,
          }),
        });

        if (isMounted) {
          if (!estimatedGas) {
            console.warn("Failed to estimate gas.");
            setNetworkFee({ fee: "0.000000000000 POL", usdValue: "($0.00)" });
            return;
          }

          const gasCost = await fetchGasCost(chainId, estimatedGas);

          setNetworkFee(gasCost);
        }
      } catch (error) {
        console.error("Error fetching network fee:", error);
        if (isMounted) {
          setNetworkFee({ fee: "0.000000000000 POL", usdValue: "($0.00)" });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchFee();

    return () => {
      isMounted = false;
    };
  }, [
    open,
    chainId,
    memoizedAccount?.address,
    functionDetails.abi,
    functionDetails.functionName,
    functionDetails.address,
  ]);

  return { networkFee, isLoading };
};

export const useAssets = (
  network: UseAppKitNetworkReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const [chainIcon, setChainIcon] = useState<string>("");
  const [tokenIcon, setTokenIcon] = useState<string>("");

  const nativeTokenIdMap: Record<number, string> = {
    137: "polygon",
    56: "bnb",
  };

  const chainName = nativeTokenIdMap[network.chainId as number] || "polygon";

  useEffect(() => {
    const chain = getAssets(chainName, "chain");
    const token = getAssets(subscriptionDetails.token.toLowerCase(), "token");
    setChainIcon(chain || getAssets("polygon", "chain"));
    setTokenIcon(token || getAssets("usdt", "token"));
  }, [chainName, subscriptionDetails.token]);

  return { chainIcon, tokenIcon };
};

export const useSubscriptionInfo = (
  network: UseAppKitNetworkReturn,
  account: UseAppKitAccountReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const { tokenDetails } = useTokenDetails(network, subscriptionDetails);

  const tokenAbi = getTokenABI(tokenDetails?.name || "USDT");
  const papayaAddress = tokenDetails?.papayaAddress || "0x0";
  const tokenAddress = tokenDetails?.ercAddress || "0x0";

  // Papaya balance is in 18 decimals.
  const papayaBalance18 = useContractData(
    papayaAddress as Address,
    Papaya,
    "balanceOf",
    [account.address as Address]
  );

  // Allowance from token contract (in token decimals, e.g., 6 for USDC)
  const tokenAllowance = useContractData(
    tokenAddress as Address,
    tokenAbi,
    "allowance",
    [account.address as Address, papayaAddress as Address]
  );

  // Token balance is in token units (e.g., 6 decimals for USDC)
  const userTokenBalance = useContractData(
    tokenAddress as Address,
    tokenAbi,
    "balanceOf",
    [account.address as Address]
  );

  // Convert the subscription cost (provided in human-readable form) to token units (6 decimals)
  const subscriptionCostTokenUnits = parseUnits(subscriptionDetails.cost, 6); // e.g. "0.99" becomes 990000 (if 6 decimals)
  // Convert that cost to 18 decimals for internal comparison with Papaya balance.
  const subscriptionCost18 = subscriptionCostTokenUnits * BigInt(1e12);

  // Compute the subscription rate in 18 decimals per second using your helper.
  // For example, if payCycle is "monthly", subscriptionRate18 = subscriptionCost18 / seconds_in_month.
  const subscriptionRate18 = calculateSubscriptionRate(
    subscriptionCost18,
    subscriptionDetails.payCycle
  );

  // Define the safe liquidation period (2 days in seconds).
  const SAFE_LIQUIDATION_PERIOD_SECONDS = BigInt(172800);
  // Compute the safety buffer (in 18 decimals) covering the safe liquidation period.
  const safetyBuffer18 = subscriptionRate18 * SAFE_LIQUIDATION_PERIOD_SECONDS;
  // The total required deposit in 18 decimals is the subscription cost plus the safety buffer.
  const requiredDeposit18 = subscriptionCost18 + safetyBuffer18;
  // Convert the required deposit into token units (6 decimals).
  const requiredDepositTokenUnits = requiredDeposit18 / BigInt(1e12);

  // Determine if a deposit is needed:
  // Papaya balance is in 18 decimals; if it's less than requiredDeposit18, deposit is needed.
  const needsDeposit =
    papayaBalance18 == null || papayaBalance18 < requiredDeposit18;

  // Calculate how much deposit is missing in token units (6 decimals).
  // Convert existing Papaya balance from 18 decimals to token units:
  const currentDepositTokenUnits =
    papayaBalance18 != null ? papayaBalance18 / parseUnits("1", 12) : BigInt(0);
  const depositShortfallTokenUnits =
    currentDepositTokenUnits >= requiredDepositTokenUnits
      ? BigInt(0)
      : requiredDepositTokenUnits - currentDepositTokenUnits;

  // needsApproval is true if token allowance is less than the required deposit (in token units).
  const needsApproval =
    tokenAllowance == null || tokenAllowance < depositShortfallTokenUnits;

  // Determine if the user can subscribe:
  // If no deposit is needed: Papaya balance (18 decimals) must meet the required deposit.
  // If deposit is needed: the user's token balance (6 decimals) must cover the shortfall.
  const canSubscribe =
    (!needsDeposit &&
      papayaBalance18 != null &&
      papayaBalance18 >= requiredDeposit18) ||
    (needsDeposit &&
      userTokenBalance != null &&
      userTokenBalance >= depositShortfallTokenUnits);

  return {
    papayaBalance: papayaBalance18,
    allowance: tokenAllowance,
    tokenBalance: userTokenBalance,
    needsDeposit,
    depositAmount: depositShortfallTokenUnits, // in token units (6 decimals)
    needsApproval,
    canSubscribe,
  };
};

export const useSubscriptionModal = (
  network: UseAppKitNetworkReturn | null,
  account: UseAppKitAccountReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const defaultCaipNetwork: CaipNetwork = {
    id: 137,
    chainNamespace: "eip155",
    caipNetworkId: "eip155:137",
    name: "Polygon",
    nativeCurrency: {
      name: "POL",
      symbol: "POL",
      decimals: 18,
    },
    rpcUrls: polygon.rpcUrls,
  };

  const defaultNetwork: UseAppKitNetworkReturn = {
    caipNetwork: defaultCaipNetwork,
    chainId: 137,
    caipNetworkId: "eip155:137",
    switchNetwork: () => {},
  };

  const activeNetwork = network ?? defaultNetwork;

  const { chainIcon, tokenIcon } = useAssets(
    activeNetwork,
    subscriptionDetails
  );

  const { tokenDetails, isUnsupportedNetwork, isUnsupportedToken } =
    useTokenDetails(activeNetwork, subscriptionDetails);

  const fallbackValues = {
    papayaBalance: null,
    allowance: null,
    tokenBalance: null,
    needsDeposit: false,
    depositAmount: BigInt(0),
    needsApproval: false,
    canSubscribe: false,
  };

  const subscriptionInfo = useSubscriptionInfo(
    activeNetwork,
    account,
    subscriptionDetails
  );

  if (isUnsupportedNetwork || isUnsupportedToken) {
    return {
      chainIcon: chainIcon || "",
      tokenIcon: tokenIcon || "",
      ...fallbackValues,
      isUnsupportedNetwork,
      isUnsupportedToken,
      tokenDetails,
    };
  }

  return {
    chainIcon,
    tokenIcon,
    ...subscriptionInfo,
    isUnsupportedNetwork,
    isUnsupportedToken,
    tokenDetails,
  };
};
