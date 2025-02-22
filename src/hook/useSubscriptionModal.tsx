import { useReadContract } from "wagmi";
import { estimateGas } from "@wagmi/core";
import { SubscriptionDetails } from "../types";
import { Abi, Address, encodeFunctionData, parseUnits } from "viem";
import { networks } from "../constants/networks";
import { USDT } from "../contracts/evm/USDT";
import { USDC } from "../contracts/evm/USDC";
import { PYUSD } from "../contracts/evm/PYUSD";
import { useEffect, useMemo, useState } from "react";
import { fetchGasCost, getAssets, getChain } from "../utils";
import {
  CaipNetwork,
  UseAppKitAccountReturn,
  UseAppKitNetworkReturn,
} from "@reown/appkit";
import { mainnet } from "viem/chains";
import { Papaya } from "../contracts/evm/Papaya";
import { wagmiConfig } from "../contexts/SubscriptionProvider";

export const useTokenDetails = (
  network: UseAppKitNetworkReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const defaultNetwork = networks.find((n) => n.chainId === 1);
  if (!defaultNetwork) {
    throw new Error(
      "Default network (Ethereum) is missing in the configuration."
    );
  }

  const defaultToken = defaultNetwork.tokens.find(
    (t) => t.name.toLowerCase() === "usdc"
  );
  if (!defaultToken) {
    throw new Error("Default token (USDC) is missing in the configuration.");
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
    case "PYUSD":
      return PYUSD;
    default:
      return USDC;
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

        const chain = getChain(chainId);

        let chainPrefix = "mainnet";

        switch (chainId) {
          case 1:
            chainPrefix = "mainnet";
            break;
          case 56:
            chainPrefix = "bsc-mainnet";
            break;
          case 137:
            chainPrefix = "polygon-mainnet";
            break;
          case 43114:
            chainPrefix = "avalanche-mainnet";
            break;
          case 8453:
            chainPrefix = "base-mainnet";
            break;
          case 42161:
            chainPrefix = "arbitrum-mainnet";
            break;
          default:
            break;
        }

        if (!wagmiConfig) {
          console.warn("Wagmi is not properly configured.");
          setNetworkFee({ fee: "0.000000000000 ETH", usdValue: "($0.00)" });
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
            setNetworkFee({ fee: "0.000000000000 ETH", usdValue: "($0.00)" });
            return;
          }

          const gasCost = await fetchGasCost(chainId, estimatedGas);

          setNetworkFee(gasCost);
        }
      } catch (error) {
        console.error("Error fetching network fee:", error);
        if (isMounted) {
          setNetworkFee({ fee: "0.000000000000 ETH", usdValue: "($0.00)" });
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
    43114: "avalanche",
    8453: "base",
    42161: "arbitrum",
    1: "ethereum",
  };

  const chainName = nativeTokenIdMap[network.chainId as number] || "ethereum";

  useEffect(() => {
    const chain = getAssets(chainName, "chain");
    const token = getAssets(subscriptionDetails.token.toLowerCase(), "token");
    setChainIcon(chain || getAssets("ethereum", "chain"));
    setTokenIcon(token || getAssets("usdc", "token"));
  }, [chainName, subscriptionDetails.token]);

  return { chainIcon, tokenIcon };
};

export const useSubscriptionInfo = (
  network: UseAppKitNetworkReturn,
  account: UseAppKitAccountReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const { tokenDetails } = useTokenDetails(network, subscriptionDetails);

  const abi = getTokenABI(tokenDetails?.name || "USDC");
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

  const hasSufficientBalance =
    tokenBalance != null && tokenBalance >= depositAmount;

  const canSubscribe =
    !needsDeposit &&
    papayaBalance != null &&
    papayaBalance >= parseUnits(subscriptionDetails.cost, 18);

  return {
    papayaBalance,
    allowance,
    tokenBalance,
    needsDeposit,
    depositAmount,
    needsApproval,
    hasSufficientBalance,
    canSubscribe,
  };
};

export const useSubscriptionModal = (
  network: UseAppKitNetworkReturn | null,
  account: UseAppKitAccountReturn,
  subscriptionDetails: SubscriptionDetails
) => {
  const defaultCaipNetwork: CaipNetwork = {
    id: 1,
    chainNamespace: "eip155",
    caipNetworkId: "eip155:1",
    name: "Ethereum",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrls: mainnet.rpcUrls,
  };

  const defaultNetwork: UseAppKitNetworkReturn = {
    caipNetwork: defaultCaipNetwork,
    chainId: 1,
    caipNetworkId: "eip155:1",
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
    hasSufficientBalance: false,
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
