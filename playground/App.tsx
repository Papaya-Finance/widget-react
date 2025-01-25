import React, { useState } from "react";
import { SubscriptionModal, SubscriptionProvider } from "../src";

const App: React.FC = () => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <SubscriptionProvider>
      <div style={{ padding: "20px" }}>
        <h1>Widget React Playground</h1>
        <button onClick={() => setIsOpen(!isOpen)}>Toggle Modal</button>
        <SubscriptionModal open={isOpen} onClose={() => setIsOpen(false)} />
      </div>
    </SubscriptionProvider>
  );
};

export default App;
