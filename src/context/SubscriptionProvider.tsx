import React, { createContext, useContext, useState } from "react";

interface SubscriptionContextType {
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  approve: () => Promise<void>;
  subscribe: () => Promise<void>;
  isApproved: boolean;
  subscriptionDetails: {
    cost: number;
    token: string;
    expiration: string;
    networkFee: number;
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
    <SubscriptionContext.Provider
      value={{
        walletAddress,
        connectWallet,
        approve,
        subscribe,
        isApproved,
        subscriptionDetails: {
          cost: 9.99,
          token: "USDC",
          expiration: "3 months",
          networkFee: 0.0042583,
        },
      }}
    >
      {children}
    </SubscriptionContext.Provider>
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
