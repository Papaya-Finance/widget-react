import React, { createContext, useContext, useEffect, useState } from "react";
import { createAppKit } from "@reown/appkit/react";
import { WagmiProvider } from "wagmi";
import { arbitrum, mainnet } from "@reown/appkit/networks";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";

const queryClient = new QueryClient();

const projectId = "1eca0e2385e349a419a418e7ed0a8249";
const metadata = {
  name: "WidgetReact",
  description: "Subscription Widget with Reown Integration",
  url: "https://subscription-hub-ruddy.vercel.app/",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

const networks = [mainnet, arbitrum];

// 4. Create Wagmi Adapter
const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: true,
});

// 5. Create modal
createAppKit({
  adapters: [wagmiAdapter],
  networks: [mainnet, arbitrum],
  defaultNetwork: mainnet,
  projectId,
  metadata,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
});

export enum Chains {
  ETHEREUM = "ethereum",
  BNBCHAIN = "bnb",
  POLYGON = "polygon",
  AVALANCHE = "avalanche",
  ARBITRUM = "arbitrum",
  BASE = "base",
  SCROLL = "scroll",
  ZKSYNC = "zksync",
  SEI = "sei",
  SOLANA = "solana",
  TON = "ton",
}

export enum ChainsNativeToken {
  ETHEREUM = "ETH",
  BNBCHAIN = "BNB",
  POLYGON = "POL",
  AVALANCHE = "AVAX",
  ARBITRUM = "ETH",
  BASE = "ETH",
  SCROLL = "ETH",
  ZKSYNC = "ETH",
  SEI = "SEI",
  SOLANA = "SOL",
  TON = "TON",
}

export enum Tokens {
  USDT = "usdt",
  USDC = "usdc",
  PYUSD = "pyusd",
}

export enum SubscriptionPayCycle {
  Daily = "/daily",
  Weekly = "/weekly",
  Monthly = "/monthly",
  Yearly = "/yearly",
}

interface SubscriptionContextType {
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  approve: () => Promise<void>;
  subscribe: () => Promise<void>;
  isApproved: boolean;
  subscriptionDetails: {
    cost: number;
    chain: Chains;
    token: Tokens;
    expiration: string;
    payCycle: SubscriptionPayCycle;
  };
}

export const SubscriptionContext =
  createContext<SubscriptionContextType | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const connectWallet = async () => {
    console.log("Connecting wallet...");
    setWalletAddress("0x0d0e...2ccf4");
  };

  const approve = async () => {
    console.log("Approving...");
    setIsApproved(true);
  };

  const subscribe = async () => {
    console.log("Subscribing...");
  };

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <SubscriptionContext.Provider
          value={{
            walletAddress,
            connectWallet,
            approve,
            subscribe,
            isApproved,
            subscriptionDetails: {
              cost: 9.99,
              chain: Chains.POLYGON,
              token: Tokens.USDT,
              expiration: "3 months",
              payCycle: SubscriptionPayCycle.Weekly,
            },
          }}
        >
          {children}
        </SubscriptionContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }
  return context;
};
