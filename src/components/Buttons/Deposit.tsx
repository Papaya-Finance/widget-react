import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address } from "viem";
import { networks } from "../../constants/networks";
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
      if (!error.message?.includes("User rejected the request")) {
        onError("Failed to deposit", getReadableErrorMessage(error));
      }
      setIsProcessing(false);
    }
  }, [isError, error]);

  return (
    <form onSubmit={submit} style={{ width: "100%" }}>
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
