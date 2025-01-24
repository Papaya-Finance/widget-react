import React from "react";

interface WalletButtonProps {
  onClick: () => void;
}

export const WalletButton: React.FC<WalletButtonProps> = ({ onClick }) => {
  return (
    <button className="wallet-button" onClick={onClick}>
      Connect Wallet
    </button>
  );
};
