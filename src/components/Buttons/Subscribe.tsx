import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address } from "viem";
import { SubscriptionPayCycle } from "../../constants/enums";
import {
  calculateSubscriptionRate,
  getReadableErrorMessage,
} from "../../utils";
import { networks } from "../../constants/networks";

interface SubscribeProps {
  chainId: number;
  canSubscribe: boolean;
  abi: Abi;
  toAddress: Address;
  subscriptionCost: bigint;
  subscriptionCycle: SubscriptionPayCycle;
  papayaAddress: Address;
  onSuccess?: () => void;
  onError?: (title: string, description: string) => void;
}

export const Subscribe: React.FC<SubscribeProps> = ({
  chainId = 1,
  canSubscribe,
  abi,
  toAddress,
  subscriptionCost,
  subscriptionCycle,
  papayaAddress,
  onSuccess = null,
  onError = null,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: hash,
    isError,
    error,
    isPending,
    writeContract,
  } = useWriteContract();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const subscriptionRate = calculateSubscriptionRate(
      subscriptionCost,
      subscriptionCycle
    );

    setIsProcessing(true);

    writeContract({
      abi,
      address: papayaAddress,
      functionName: "subscribe",
      args: [toAddress, subscriptionRate, 0],
    });
  }

  const activeNetwork = networks.find((network) => network.chainId === chainId);
  const defaultConfirmations = activeNetwork?.defaultConfirmations || 1;

  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    confirmations: defaultConfirmations,
    hash,
  });

  useEffect(() => {
    if (isConfirmed) {
      setIsProcessing(false);
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [isConfirmed, onSuccess]);

  useEffect(() => {
    if (isError && onError) {
      onError("Failed to subscribe", getReadableErrorMessage(error));
      setIsProcessing(false);
    }
  }, [isError, error]);

  return (
    <form onSubmit={submit} style={{ width: "100%" }}>
      <button
        type="submit"
        disabled={!canSubscribe || isProcessing || isPending}
        className={`subscribe-button ${
          !canSubscribe || isProcessing || isPending ? "disabled" : ""
        }`}
      >
        {isProcessing || isPending ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p className="button-text">Processing...</p>
          </div>
        ) : (
          <p className="button-text">Subscribe</p>
        )}
      </button>
    </form>
  );
};
