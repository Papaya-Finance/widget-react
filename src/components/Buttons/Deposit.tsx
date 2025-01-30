import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address } from "viem";
import { getReadableErrorMessage } from "../../utils";

interface DepositProps {
  chainId: number;
  needsDeposit: boolean;
  depositAmount: bigint;
  abi: Abi;
  papayaAddress: Address;
  hasSufficientBalance: boolean;
  onSuccess?: () => void;
  onError?: (title: string, description: string) => void;
}

export const Deposit: React.FC<DepositProps> = ({
  chainId,
  needsDeposit,
  depositAmount,
  abi,
  papayaAddress,
  hasSufficientBalance,
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

    if (!hasSufficientBalance) {
      console.error("Insufficient token balance.");
      return;
    }

    setIsProcessing(true);

    writeContract({
      abi,
      address: papayaAddress,
      functionName: "deposit",
      args: [depositAmount, false],
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
        onError?.("Failed to deposit", getReadableErrorMessage(error));
      }
      setIsProcessing(false);
    }
  }, [isError, isReceiptError, error]);

  return (
    <form
      className={needsDeposit ? "" : "hidden"}
      onSubmit={submit}
      style={{ width: "100%" }}
    >
      <button
        type="submit"
        disabled={
          !needsDeposit || !hasSufficientBalance || isProcessing || isPending
        }
        className={`deposit-button ${
          !needsDeposit || !hasSufficientBalance || isProcessing || isPending
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
            {hasSufficientBalance ? "Deposit" : "Insufficient Balance"}
          </p>
        )}
      </button>
    </form>
  );
};
