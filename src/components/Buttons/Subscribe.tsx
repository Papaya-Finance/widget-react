import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address, encodeFunctionData } from "viem";
import { SubscriptionPayCycle } from "../../constants/enums";
import {
  calculateSubscriptionRate,
  getReadableErrorMessage,
  getPermit,
} from "../../utils";
import { useAppKitAccount } from "@reown/appkit/react";
import { buildBySigTraits, NonceType } from "@1inch/solidity-utils";
import { ethers } from "ethers6";
import { signTypedData } from "@wagmi/core";
import { wagmiAdapter, wagmiConfig } from "../../contexts/SubscriptionProvider";
import { getTokenABI } from "../../hook/useSubscriptionModal";

interface SubscribeProps {
  chainId: number;
  needsDeposit: boolean;
  canSubscribe: boolean;
  abi: Abi;
  tokenName: string;
  tokenAddress: Address;
  toAddress: Address;
  subscriptionCost: bigint;
  subscriptionCycle: SubscriptionPayCycle;
  papayaAddress: Address;
  depositAmount?: bigint;
  onSuccess?: () => void;
  onError?: (title: string, description: string) => void;
}

export const Subscribe: React.FC<SubscribeProps> = ({
  chainId = 1,
  needsDeposit,
  canSubscribe,
  abi,
  tokenName,
  tokenAddress,
  toAddress,
  subscriptionCost,
  subscriptionCycle,
  papayaAddress,
  depositAmount,
  onSuccess = null,
  onError = null,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const account = useAppKitAccount();

  const {
    data: hash,
    isError,
    error,
    isPending,
    writeContract,
  } = useWriteContract();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setIsProcessing(true);

    const subscriptionRate = calculateSubscriptionRate(
      subscriptionCost,
      subscriptionCycle
    );

    const provider = wagmiAdapter.getWalletConnectProvider();

    if (needsDeposit) {
      try {
        const permit = await getPermit(
          { address: account.address! },
          tokenAddress,
          getTokenABI(tokenName),
          provider,
          "1",
          chainId,
          papayaAddress, // spender
          depositAmount!.toString(), // amount as string
          (Math.floor(Date.now() / 1000) + 100).toString() // deadline as string
        );

        const tokenPermit = ethers.solidityPacked(
          ["address", "bytes"],
          [tokenAddress, permit as Address]
        );

        // Encode the deposit call: deposit(depositAmount, false)
        const depositCallData = encodeFunctionData({
          abi,
          functionName: "deposit",
          args: [depositAmount, false],
        });

        // Encode the subscribe call: subscribe(toAddress, subscriptionRate, 0)
        const subscribeCallData = encodeFunctionData({
          abi,
          functionName: "subscribe",
          args: [toAddress, subscriptionRate, 0],
        });

        // Encode the permitAndCall call: permitAndCall(tokenPermit, depositCallData)
        const permitAndCallData = encodeFunctionData({
          abi,
          functionName: "permitAndCall",
          args: [tokenPermit, depositCallData],
        });

        // Build the sponsoredCall struct
        const traits = buildBySigTraits({
          deadline: 0xffffffffff,
          nonceType: NonceType.Selector,
          nonce: 0,
        });

        const sponsoredCall = {
          traits,
          data: encodeFunctionData({
            abi,
            functionName: "sponsoredCall",
            args: [tokenAddress, depositAmount, permitAndCallData, "0x"],
          }),
        };

        // Sign the sponsoredCall using wagmi's signTypedData.
        // (Ensure that your domain, types, and message match your contract's expectations.)
        const signature = await signTypedData(wagmiConfig, {
          domain: {
            name: "Papaya",
            version: "1",
            chainId,
            verifyingContract: papayaAddress,
          },
          types: {
            SignedCall: [
              { name: "traits", type: "uint256" },
              { name: "data", type: "bytes" },
            ],
          },
          primaryType: "SignedCall",
          message: sponsoredCall,
        });

        // Encode the bySig call: bySig(account.address, sponsoredCall, signature)
        const bySigCallData = encodeFunctionData({
          abi,
          functionName: "bySig",
          args: [account.address, sponsoredCall, signature],
        });

        // Finally, execute the multicall that combines the deposit (via bySig) and subscribe calls.
        writeContract({
          abi,
          address: papayaAddress,
          functionName: "multicall",
          args: [[bySigCallData, subscribeCallData]],
        });
      } catch (err: any) {
        onError?.(
          "Failed to combine deposit and subscribe",
          getReadableErrorMessage(err)
        );
        setIsProcessing(false);
        return;
      }
    } else {
      writeContract({
        abi,
        address: papayaAddress,
        functionName: "subscribe",
        args: [toAddress, subscriptionRate, 0],
      });
    }
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
          <p className="button-text">
            {needsDeposit ? "Deposit & Subscribe" : "Subscribe"}
          </p>
        )}
      </button>
    </form>
  );
};
