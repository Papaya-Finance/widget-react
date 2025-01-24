import React from "react";
import { useSubscription } from "../context/SubscriptionProvider";
import "./styles.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
}

export const SubscriptionModal: React.FC<ModalProps> = ({ open, onClose }) => {
  const {
    walletAddress,
    connectWallet,
    approve,
    subscribe,
    subscriptionDetails,
    isApproved,
  } = useSubscription();

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        {!walletAddress ? (
          <button className="wallet-button" onClick={connectWallet}>
            Connect Wallet
          </button>
        ) : (
          <>
            <div className="summary">
              <p>
                Subscription Cost: {subscriptionDetails.token}{" "}
                {subscriptionDetails.cost} (~${subscriptionDetails.cost})
              </p>
              <p>Expiration: {subscriptionDetails.expiration}</p>
              <p>Network Fee: {subscriptionDetails.networkFee} MATIC</p>
            </div>
            <button
              className={`approve-button ${isApproved ? "approved" : ""}`}
              onClick={approve}
              disabled={isApproved}
            >
              {isApproved ? "Approved" : "Approve"}
            </button>
            <button
              className="subscribe-button"
              onClick={subscribe}
              disabled={!isApproved}
            >
              Subscribe
            </button>
          </>
        )}
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};
