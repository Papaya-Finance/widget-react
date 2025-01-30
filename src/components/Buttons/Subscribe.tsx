import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address } from "viem";
import { SubscriptionPayCycle } from "../../constants/enums";
import {
  calculateSubscriptionRate,
  getReadableErrorMessage,
} from "../../utils";

interface SubscribeProps {
  chainId: number;
  needsDeposit: boolean;
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
  needsDeposit,
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

  const { isSuccess: isConfirmed, isError: isReceiptError } =
    useWaitForTransactionReceipt({
      hash,
    });

  useEffect(() => {
    if (isConfirmed) {
      setIsProcessing(false);
      onSuccess?.();
    }
  }, [isConfirmed, onSuccess]);

  useEffect(() => {
    if (isError || isReceiptError) {
      if (!error?.message?.includes("User rejected the request")) {
        onError?.("Failed to subscribe", getReadableErrorMessage(error));
      }
      setIsProcessing(false);
    }
  }, [isError, isReceiptError, error]);

  return (
    <form
      className={needsDeposit ? "hidden" : ""}
      onSubmit={submit}
      style={{ width: "100%" }}
    >
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
