# Papaya Subscription React Widget SDK

The Papaya Widget React SDK provides an easy way to integrate Papaya subscription payments into your applications.  

---

## Features  

- **Subscription Management:** Simplified and secure subscription payment flows.  
- **Automatic Providers:** No need to configure wallet or query providers in your app—handled by the SDK.  
- **Multi-Network Support:** Supports Ethereum, BSC, Polygon, Avalanche, Arbitrum, Base, and more.  
- **Customization:** Easily configure metadata, themes, and supported networks.  

---

## Installation  

Install the SDK using **npm**:  

```bash  
npm install @papaya-finance/widget-react  
```  

Or using **yarn**:  

```bash  
yarn add @papaya-finance/widget-react  
```  

---

## Prerequisites  

1. **Project ID**  
   Obtain your `projectId` from the [Reown Cloud Dashboard](https://cloud.reown.finance). Ensure your app's URL is whitelisted in the dashboard to allow usage of the SDK.  

2. **Peer Dependencies**  
   The SDK requires the following dependencies in your project:  

   ```bash  
   npm install react react-dom @reown/appkit @reown/appkit-adapter-wagmi @reown/appkit-wallet-button wagmi @tanstack/react-query viem  
   ```  

   Or using **yarn**:  

   ```bash  
   yarn add react react-dom @reown/appkit @reown/appkit-adapter-wagmi @reown/appkit-wallet-button wagmi @tanstack/react-query viem  
   ```  

---

## Usage  

### 1. Configure the SDK  

Create a configuration file (`config.ts`) to set up metadata, networks, and the `wagmiAdapter`:  

```typescript  
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";  
import { mainnet, bsc, polygon, avalanche, arbitrum, base, AppKitNetwork } from "@reown/appkit/networks";  
import { cookieStorage, createStorage } from "@wagmi/core";  

export const metadata = {  
  name: "Your App",  
  description: "App powered by Papaya Widget React SDK",  
  url: "https://your-app-url.com/",  
  icons: [],  
};  

export const projectId = "your_reown_project_id"; // Obtain this from Reown Cloud Dashboard  

export const networks: AppKitNetwork[] = [  
  mainnet,  
  bsc,  
  polygon,  
  avalanche,  
  arbitrum,  
  base,  
];  

export const wagmiAdapter = new WagmiAdapter({  
  storage: createStorage({ storage: cookieStorage }),  
  ssr: true,  
  projectId,  
  networks,  
});  
```  

### 2. Wrap Your App  

Use the `SubscriptionProvider` to wrap your application. Passing `wagmiAdapter` and `queryClient` ensures you don't need to configure wallet or React Query providers manually—this is handled internally by the SDK:  

```tsx  
"use client";  

import React from "react";  
import { wagmiAdapter, metadata, projectId, networks } from "../config";  
import { SubscriptionProvider } from "@papaya-finance/widget-react";  
import { QueryClient } from "@tanstack/react-query";  

const queryClient = new QueryClient();  

const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {  
  return (  
    <SubscriptionProvider  
      wagmiAdapter={wagmiAdapter}  
      queryClient={queryClient}  
      metadata={metadata}  
      themeMode="light"  
      projectId={projectId}  
      networks={networks}  
    >  
      {children}  
    </SubscriptionProvider>  
  );  
};  

export default Providers;  
```  

### 3. Add Subscription Modal  

Integrate the `SubscriptionModal` in your component. The modal handles subscription logic, including approval, deposits, and payments:  

```tsx  
import React, { useState } from "react";  
import { SubscriptionModal } from "@papaya-finance/widget-react";  
import { SubscriptionPayCycle } from "@papaya-finance/widget-react/constants/enums";  

const SubscriptionDemo: React.FC = () => {  
  const [isModalOpen, setIsModalOpen] = useState(false);  

  return (  
    <>  
      <button onClick={() => setIsModalOpen(true)}>Subscribe Now</button>  

      <SubscriptionModal  
        open={isModalOpen}  
        onClose={() => setIsModalOpen(false)}  
        subscriptionDetails={{  
          toAddress: "0xYourSubscriptionAddress",  
          cost: "0.99",  
          token: "usdt", // Supported: usdt, usdc, pyusd  
          payCycle: SubscriptionPayCycle.Monthly, // daily, weekly, monthly, yearly  
        }}  
      />  
    </>  
  );  
};  

export default SubscriptionDemo;  
```  

---

## Props Overview  

### SubscriptionProvider  

| Prop            | Type            | Description                                      |  
|-----------------|-----------------|--------------------------------------------------|  
| `wagmiAdapter`  | `WagmiAdapter`  | Adapter for wallet management.                  |  
| `queryClient`   | `QueryClient`   | Query client for React Query.                   |  
| `metadata`      | `object`        | Metadata for your application (name, url, etc). |  
| `projectId`     | `string`        | Your unique project ID.                         |  
| `networks`      | `AppKitNetwork[]` | List of supported networks.                     |  

### SubscriptionModal  

| Prop                 | Type                       | Description                                           |  
|---------------------|---------------------------|-------------------------------------------------------|  
| `open`              | `boolean`                 | Controls the modal visibility.                       |  
| `onClose`           | `() => void`              | Function called when the modal is closed.            |  
| `subscriptionDetails` | `{ toAddress, cost, token, payCycle }` | Details about the subscription.                      |  

---

## Notes  

- Ensure the app's URL is whitelisted in the Reown Cloud Dashboard for the project ID.  
- The SDK internally handles the wallet provider and React Query provider when `wagmiAdapter` and `queryClient` are passed.  

---

## Example App  

Check out the [demo app](https://widget-demo-flame.vercel.app/) to see the SDK in action.  

---

## License  

This SDK is licensed under the Appache License.
