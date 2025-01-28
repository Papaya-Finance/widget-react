import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppKit } from "@reown/appkit/react";
import { SubscriptionProviderProps } from "../types";
import { Config, cookieToInitialState, WagmiProvider } from "wagmi";
import { AppKitNetwork } from "@reown/appkit/networks";

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({
  children,
  cookies,
  wagmiAdapter,
  queryClient,
  metadata,
  themeMode = "light",
  projectId,
  networks,
}) => {
  if (!wagmiAdapter || !wagmiAdapter.wagmiConfig) {
    throw new Error(
      "Invalid wagmiAdapter configuration. Please check your setup."
    );
  }

  const initialState = cookieToInitialState(
    wagmiAdapter.wagmiConfig as Config,
    cookies
  );

  const tupledNetworks: [AppKitNetwork, ...AppKitNetwork[]] = networks as [
    AppKitNetwork,
    ...AppKitNetwork[]
  ];

  createAppKit({
    adapters: [wagmiAdapter],
    projectId,
    networks: tupledNetworks,
    defaultNetwork: networks[0],
    metadata,
    features: {
      analytics: true,
    },
    themeMode,
    themeVariables: {
      "--w3m-font-family": "Public Sans",
      "--w3m-accent": "#212b35",
      "--w3m-font-size-master": "8.75px",
      "--w3m-border-radius-master": "2.285714286px",
    },
  });

  return (
    <WagmiProvider
      config={wagmiAdapter.wagmiConfig as Config}
      initialState={initialState}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
};
