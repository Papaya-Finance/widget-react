import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address, encodeFunctionData } from "viem";
import { SubscriptionPayCycle } from "../../constants/enums";
import {
  calculateSubscriptionRate,
  getReadableErrorMessage,
} from "../../utils";
import { projectId } from "../../contexts/SubscriptionProvider";

interface SubscribeProps {
  chainId: number;
  needsApproval: boolean;
  needsDeposit: boolean;
  canSubscribe: boolean;
  abi: Abi;
  toAddress: Address;
  subscriptionCost: bigint;
  subscriptionCycle: SubscriptionPayCycle;
  papayaAddress: Address;
  depositAmount: bigint;
  onStart?: () => void;
  onSuccess?: () => void;
  onError?: (title: string, description: string) => void;
}

export const Subscribe: React.FC<SubscribeProps> = ({
  chainId = 137,
  needsApproval,
  needsDeposit,
  canSubscribe,
  abi,
  toAddress,
  subscriptionCost,
  subscriptionCycle,
  papayaAddress,
  depositAmount,
  onStart = null,
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

    if (onStart) {
      onStart();
    }

    setIsProcessing(true);

    const subscriptionRate = calculateSubscriptionRate(
      subscriptionCost,
      subscriptionCycle
    );

    if (needsDeposit) {
      try {
        const depositCallData = encodeFunctionData({
          abi,
          functionName: "deposit",
          args: [depositAmount, false],
        });

        const subscribeCallData = encodeFunctionData({
          abi,
          functionName: "subscribe",
          args: [toAddress, subscriptionRate, BigInt(projectId)],
        });

        const combinedCalls = [depositCallData, subscribeCallData];

        writeContract({
          abi,
          address: papayaAddress,
          functionName: "multicall",
          args: [combinedCalls],
        });
      } catch (err: any) {
        console.error(err);
        onError?.(
          "Failed to perform deposit and subscribe",
          getReadableErrorMessage(err)
        );
        setIsProcessing(false);
        return;
      }
    } else {
      try {
        writeContract({
          abi,
          address: papayaAddress,
          functionName: "subscribe",
          args: [toAddress, subscriptionRate, projectId],
        });
      } catch (err: any) {
        console.error(err);
        onError?.("Failed to perform subscribe", getReadableErrorMessage(err));
        setIsProcessing(false);
        return;
      }
    }
  }

  const { isSuccess: isConfirmed, isError: isReceiptError } =
    useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConfirmed) {
      setIsProcessing(false);
      onSuccess?.();
    }
  }, [isConfirmed, onSuccess]);

  useEffect(() => {
    if (isError || isReceiptError) {
      if (!error?.message?.includes("User rejected the request")) {
        console.error(error);
        onError?.("Failed to subscribe", getReadableErrorMessage(error));
      }
      setIsProcessing(false);
    }
  }, [isError, isReceiptError, error]);

  return (
    <form onSubmit={submit} style={{ width: "100%" }}>
      <button
        type="submit"
        disabled={needsApproval || !canSubscribe || isProcessing || isPending}
        className={`subscribe-button ${
          needsApproval || !canSubscribe || isProcessing || isPending
            ? "disabled"
            : ""
        }`}
      >
        {isProcessing || isPending ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p className="button-text">Processing...</p>
          </div>
        ) : (
          <p className="button-text">
            {needsDeposit ? "Deposit & Subscribe" : "Subscribe"}
          </p>
        )}
      </button>
    </form>
  );
};
