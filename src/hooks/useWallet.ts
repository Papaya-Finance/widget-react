import { useState } from "react";
import { BrowserProvider } from "ethers";

export const useWallet = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new BrowserProvider(window.ethereum);

        const accounts = await provider.listAccounts();

        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address);
          console.log("Wallet connected:", accounts[0].address);
        } else {
          console.error("No accounts found in the wallet");
        }
      } else {
        console.error("No Ethereum provider found");
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  return {
    walletAddress,
    connectWallet,
  };
};
