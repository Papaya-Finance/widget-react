import { useContext, useState } from "react";
import { SubscriptionContext } from "../context/SubscriptionProvider";
import { apiApprove, apiSubscribe } from "../utils/api";

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error(
      "useSubscription must be used within a SubscriptionProvider"
    );
  }

  const { walletAddress, subscriptionDetails } = context;
  const [isApproving, setIsApproving] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const approve = async () => {
    if (!walletAddress) {
      console.error("Wallet not connected");
      return;
    }
    setIsApproving(true);
    try {
      await apiApprove(walletAddress, subscriptionDetails);
      console.log("Approval successful!");
    } catch (error) {
      console.error("Approval failed:", error);
    } finally {
      setIsApproving(false);
    }
  };

  const subscribe = async () => {
    if (!walletAddress) {
      console.error("Wallet not connected");
      return;
    }
    setIsSubscribing(true);
    try {
      await apiSubscribe(walletAddress, subscriptionDetails);
      console.log("Subscription successful!");
    } catch (error) {
      console.error("Subscription failed:", error);
    } finally {
      setIsSubscribing(false);
    }
  };

  return {
    approve,
    subscribe,
    isApproving,
    isSubscribing,
    walletAddress,
    subscriptionDetails,
  };
};
