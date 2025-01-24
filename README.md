# Papaya Subscription React Widget SDK

A React-based subscription modal SDK for Web3-based subscription payments.

## Installation

```bash
yarn add @papaya/widget-react
```

## Usage
```
import { SubscriptionModal, SubscriptionProvider } from "@papaya/widget-react";

function App() {
  return (
    <SubscriptionProvider>
      <SubscriptionModal open={true} onClose={() => console.log("Closed")} />
    </SubscriptionProvider>
  );
}
```