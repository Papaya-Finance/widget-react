import { useReadContract } from "wagmi";
import { estimateGas } from "@wagmi/core";
import { SubscriptionDetails } from "../types";
import { Abi, Address, encodeFunctionData, parseUnits } from "viem";
import { networks } from "../constants/networks";
import { USDT } from "../contracts/evm/USDT";
import { USDC } from "../contracts/evm/USDC";
import { useEffect, useMemo, useState } from "react";
import { fetchGasCost, getAssets } from "../utils";
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

  const abi = getTokenABI(tokenDetails?.name || "USDT");
  const papayaAddress = tokenDetails?.papayaAddress || "0x0";
  const tokenAddress = tokenDetails?.ercAddress || "0x0";

  const papayaBalance = useContractData(
    papayaAddress as Address,
    Papaya,
    "balanceOf",
    [account.address as Address]
  );

  const allowance = useContractData(tokenAddress as Address, abi, "allowance", [
    account.address as Address,
    papayaAddress as Address,
  ]);

  const tokenBalance = useContractData(
    tokenAddress as Address,
    abi,
    "balanceOf",
    [account.address as Address]
  );

  const needsDeposit =
    papayaBalance == null ||
    papayaBalance < parseUnits(subscriptionDetails.cost, 18);

  const depositAmount =
    papayaBalance != null && papayaBalance > BigInt(0)
      ? parseUnits(subscriptionDetails.cost, 6) -
        papayaBalance / parseUnits("1", 12)
      : parseUnits(subscriptionDetails.cost, 6);

  const needsApproval = allowance == null || allowance < depositAmount;

  const canSubscribe =
    (!needsDeposit &&
      papayaBalance != null &&
      papayaBalance >= parseUnits(subscriptionDetails.cost, 18)) ||
    (needsDeposit &&
      tokenBalance != null &&
      tokenBalance >= parseUnits(subscriptionDetails.cost, 6));

  return {
    papayaBalance,
    allowance,
    tokenBalance,
    needsDeposit,
    depositAmount,
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
