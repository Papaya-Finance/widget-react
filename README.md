# Papaya Subscription React Widget SDK

The Papaya Widget React SDK provides an easy way to integrate Papaya subscription payments into your react app.  

---

## Features  

- **Subscription Management:** Simplified and secure subscription payment flows.  
- **Automatic Providers:** No need to configure wallet or query providers in your app—handled by the SDK.  
- **Multi-Network Support:** Supports Ethereum, BSC, Polygon, Avalanche, Arbitrum, Base, and more.  
- **Customization:** Easily configure metadata, themes, and supported networks.  
- **Works in Both Next.js and React Apps**: Supports both SSR (Next.js) and CSR (React).  

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

Before integrating the Reown SDK, ensure you have completed the following steps:

### 1. **Obtain Your Reown Project ID**  

To get started, you need a `reownProjectId` from the [Reown Cloud Dashboard](https://cloud.reown.com/sign-in). Follow these steps:  

- Sign in to the Reown Cloud Dashboard and create a **new project**.  
- Select **AppKit** as the product.  
- Choose your platform (**React** or **Next.js**) to use this SDK.  
- Once the project is created, locate your **Project ID** on the dashboard.  

🔹 **Important:** Ensure your app’s URL is whitelisted in the Reown dashboard.  

- Navigate to **Configure Domains** and verify that your domain is whitelisted.  

---

### 2. **Obtain Your Papaya Project ID**  

To get started, you need a `papayaProjectId` from the [Papaya Cloud Dashboard](https://cloud.papaya.finance/sign-in). Follow these steps:  

[TODO]

---

### 3. **Install Peer Dependencies**  

The SDK requires several dependencies to function correctly. Install them using either **npm** or **yarn**:

#### **Using npm:**  

```bash
npm install react react-dom @reown/appkit @reown/appkit-adapter-wagmi @reown/appkit-wallet-button wagmi @tanstack/react-query viem
```

#### **Using yarn:**  

```bash
yarn add react react-dom @reown/appkit @reown/appkit-adapter-wagmi @reown/appkit-wallet-button wagmi @tanstack/react-query viem
```

---

## ⚡ **Usage in Create React App (CRA)**  

### **Step 1: Create `config.js`**  

Create a new file **`src/config.js`** and add:

```javascript
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import {
  mainnet,
  bsc,
  polygon,
  avalanche,
  arbitrum,
  base,
} from "@reown/appkit/networks";
import { cookieStorage, createStorage } from "@wagmi/core";

export const metadata = {
  name: "My App",
  description: "A subscription demo app using Papaya Widget React SDK",
  url: "http://your-react-app.com", // Whitelist this in Reown Cloud
  icons: [],
};

export const reownProjectId = "your_reown_project_id"; // Obtain from Reown Cloud
export const papayaProjectId = "your_papaya_project_Id"; // Obtain from Papaya Cloud Dashboard

export const networks = [mainnet, bsc, polygon, avalanche, arbitrum, base];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({ storage: cookieStorage }),
  ssr: false,
  reownProjectId, // Pass Reown Project ID here
  networks,
});
```

---

### **Step 2: Wrap Your App with `SubscriptionProvider`**  

Modify `src/index.js`:

```javascript
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { SubscriptionProvider } from "@papaya-finance/widget-react";
import { QueryClient } from "@tanstack/react-query";
import { wagmiAdapter, metadata, reownProjectId, papayaProjectId, networks } from "./config";

const queryClient = new QueryClient();

const RootApp = () => (
  <SubscriptionProvider
    wagmiAdapter={wagmiAdapter}
    queryClient={queryClient}
    metadata={metadata}
    themeMode="light"
    reownProjectId={reownProjectId}
    papayaProjectId={papayaProjectId}
    networks={networks}
  >
    <App />
  </SubscriptionProvider>
);

ReactDOM.render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
  document.getElementById("root")
);
```

---

### **Step 3: Use Subscription Modal in Your Components**  

Modify `App.js` to include the **subscription modal**:

```javascript
import React, { useState } from "react";
import { SubscriptionModal, SubscriptionPayCycle } from "@papaya-finance/widget-react";

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Subscription Demo</h1>
      <button onClick={() => setIsModalOpen(true)}>Subscribe Now</button>

      <SubscriptionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subscriptionDetails={{
          toAddress: "YOUR_SUBSCRIBE_TO_ADDRESS", // Replace it
          cost: "0.99", // Replace it
          token: "usdt", // Available options are: usdt, usdc, and pyusd
          payCycle: SubscriptionPayCycle.Monthly, // Available options are: Daily, Weekly, Monthly, and Yearly
        }}
      />
    </div>
  );
}

export default App;
```

---

## 🌍 **Usage in Next.js**  

In **Next.js**, you need to mark the **provider as a client component**:

### **Step 1: Create `providers.js` inside `src/`**

```javascript
"use client"; // Required for Next.js 

import React from "react";
import { SubscriptionProvider } from "@papaya-finance/widget-react";
import { QueryClient } from "@tanstack/react-query";
import { wagmiAdapter, metadata, reownProjectId, papayaProjectId, networks } from "./config"; // Config is same as React app

const queryClient = new QueryClient();

const Providers = ({ children }) => {
  return (
    <SubscriptionProvider
      wagmiAdapter={wagmiAdapter}
      queryClient={queryClient}
      metadata={metadata}
      themeMode="light" // Your theme dark or light
      reownProjectId={reownProjectId}
      papayaProjectId={papayaProjectId}
      networks={networks}
    >
      {children}
    </SubscriptionProvider>
  );
};

export default Providers;
```

---

### **Step 2: Update `_app.js` (For Pages Router)**

```javascript
import Providers from "../providers";

function MyApp({ Component, pageProps }) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}

export default MyApp;
```

---

### **Step 2: Update `layout.js` (For App Router)**

```javascript
import Providers from "../providers";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

### **Step 3: Use the Modal in a Next.js Page**

```javascript
"use client";

import React, { useState } from "react";
import { SubscriptionModal, SubscriptionPayCycle } from "@papaya-finance/widget-react";

const Page = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <h1>Subscription Demo</h1>
      <button onClick={() => setIsModalOpen(true)}>Subscribe Now</button>

      <SubscriptionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subscriptionDetails={{
          toAddress: "YOUR_SUBSCRIBE_TO_ADDRESS", // Replace it
          cost: "0.99", // Replace it
          token: "usdt", // Available options are: usdt, usdc, and pyusd
          payCycle: SubscriptionPayCycle.Monthly, // Available options are: Daily, Weekly, Monthly, and Yearly
        }}
      />
    </div>
  );
};

export default Page;
```

---

## Props Overview  

### SubscriptionProvider  

| Prop            | Type            | Description                                      |  
|-----------------|-----------------|--------------------------------------------------|  
| `wagmiAdapter`  | `WagmiAdapter`  | Adapter for wallet management.                  |  
| `queryClient`   | `QueryClient`   | Query client for React Query.                   |  
| `metadata`      | `object`        | Metadata for your application (name, url, etc). |  
| `reownProjectId`     | `string`        | Your unique Reown's project ID.                         |  
| `papayaProjectId`     | `string`        | Your unique Papaya's project ID.                         |  
| `networks`      | `AppKitNetwork[]` | List of supported networks.                     |  

### SubscriptionModal  

| Prop                 | Type                       | Description                                           |  
|---------------------|---------------------------|-------------------------------------------------------|  
| `open`              | `boolean`                 | Controls the modal visibility.                       |  
| `onClose`           | `() => void`              | Function called when the modal is closed.            |  
| `subscriptionDetails` | `{ toAddress, cost, token, payCycle }` | Details about the subscription.                      |  

---

## Notes  

- The SDK internally handles the wallet provider and React Query provider when `wagmiAdapter` and `queryClient` are passed.  

---

## Example App  

Check out the [demo app](https://widget-demo-flame.vercel.app/) to see the SDK in action.  

---

## License  

This SDK is licensed under the Appache License.
