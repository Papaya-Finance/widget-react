import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import GreenTickIcon from "../../assets/others/green-tick.svg";
import { Abi, Address } from "viem";
import { getReadableErrorMessage } from "../../utils";

interface ApproveProps {
  needsApproval: boolean;
  needsDeposit: boolean;
  approvalAmount: bigint;
  abi: Abi;
  tokenContractAddress: Address;
  papayaAddress: Address;
  onSuccess?: () => void;
  onError?: (title: string, description: string) => void;
}

export const Approve: React.FC<ApproveProps> = ({
  needsApproval,
  needsDeposit,
  approvalAmount,
  abi,
  tokenContractAddress,
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

    if (!needsDeposit) return;

    setIsProcessing(true);

    writeContract({
      abi,
      address: tokenContractAddress,
      functionName: "approve",
      args: [papayaAddress, approvalAmount],
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
        onError?.("Failed to approve", getReadableErrorMessage(error));
      }
      setIsProcessing(false);
    }
  }, [isError, isReceiptError, error]);

  const isButtonDisabled =
    isConfirmed || !needsApproval || !needsDeposit || isProcessing || isPending;

  return (
    <form onSubmit={submit} style={{ width: "100%" }}>
      <button
        type="submit"
        disabled={isButtonDisabled}
        className={`approve-button ${isButtonDisabled ? "disabled" : ""}`}
      >
        {isProcessing || isPending ? (
          <div className="spinner-container">
            <div className="spinner"></div>
            <p className="button-text">Processing...</p>
          </div>
        ) : (
          <>
            <p className="button-text">Approve</p>
            {(isConfirmed || !needsApproval || !needsDeposit) && (
              <img
                src={GreenTickIcon}
                alt="Approve Successful"
                className="image-green-tick"
              />
            )}
          </>
        )}
      </button>
    </form>
  );
};
