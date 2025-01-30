import { SubscriptionPayCycle } from "../constants/enums";
import { ThemeMode } from "@reown/appkit/react";
import { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient } from "@tanstack/react-query";

export interface Metadata {
  name: string;
  description: string;
  url: string;
  icons: string[];
}

export interface SubscriptionDetails {
  toAddress: string;
  cost: string;
  token: string;
  payCycle: SubscriptionPayCycle;
}

export interface SubscriptionProviderProps {
  children: React.ReactNode;
  cookies?: string | null;
  wagmiAdapter: WagmiAdapter;
  queryClient: QueryClient;
  metadata: Metadata;
  themeMode: ThemeMode;
  projectId: string;
  networks: AppKitNetwork[];
}
