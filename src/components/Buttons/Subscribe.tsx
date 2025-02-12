import React, { FormEvent, useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { Abi, Address, encodeFunctionData } from "viem";
import { SubscriptionPayCycle } from "../../constants/enums";
import {
  calculateSubscriptionRate,
  getReadableErrorMessage,
  getPermit,
} from "../../utils";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { signTypedData } from "@wagmi/core";
import {
  papayaProjectId,
  wagmiConfig,
} from "../../contexts/SubscriptionProvider";
import { buildBySigTraits, NonceType } from "../../utils/helpers";
import { Contract, providers } from "ethers";
import { bsc, polygon } from "viem/chains";
import { getTokenABI } from "../../hook/useSubscriptionModal";
import { ethers } from "ethers6";

interface SubscribeProps {
  chainId: number;
  needsDeposit: boolean;
  canSubscribe: boolean;
  abi: Abi; // Papaya contract ABI
  tokenName: string; // e.g. "USDC" or "USDT"
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
  chainId = 137,
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

    if (needsDeposit) {
      // For tokens that do NOT support permit (e.g. USDT), we combine an approve call
      // with deposit and subscribe in one multicall.
      // For tokens that support permit (e.g. USDC), we use the permit-based flow.
      if (tokenName.toUpperCase() === "USDT") {
        try {
          // Select an RPC provider based on chainId.
          let provider = new providers.JsonRpcProvider(
            polygon.rpcUrls.default.http[0]
          );
          if (chainId === 56) {
            provider = new providers.JsonRpcProvider(
              bsc.rpcUrls.default.http[0]
            );
          }

          // For USDT, we need to approve before depositing.
          // We'll encode the USDT approve call on the token contract.
          // Use getTokenABI to get the token ABI.
          const tokenAbi = getTokenABI(tokenName);
          // Encode the approve call: approve(papayaAddress, depositAmount)
          const approveCallData = encodeFunctionData({
            abi: tokenAbi,
            functionName: "approve",
            args: [papayaAddress, depositAmount as bigint],
          });

          // Next, encode the deposit call on the Papaya contract: deposit(depositAmount, false)
          const depositCallData = encodeFunctionData({
            abi,
            functionName: "deposit",
            args: [depositAmount, false],
          });

          // Then, encode the subscribe call on the Papaya contract:
          // subscribe(toAddress, subscriptionRate, papayaProjectId)
          const subscribeCallData = encodeFunctionData({
            abi,
            functionName: "subscribe",
            args: [toAddress, subscriptionRate, papayaProjectId],
          });

          // Now, combine these three calls in one multicall.
          // We assume that Papaya.multicall can execute calls to multiple contracts.
          // The first call (approve) is targeted at the token contract,
          // while the other two are targeted at Papaya.
          // (Your Papaya multicall implementation must support this.)
          const combinedCalls = [
            approveCallData,
            depositCallData,
            subscribeCallData,
          ];

          writeContract({
            abi,
            address: papayaAddress,
            functionName: "multicall",
            args: [combinedCalls],
          });
        } catch (err: any) {
          console.error(err);
          onError?.(
            "Failed to perform approval, deposit and subscribe",
            getReadableErrorMessage(err)
          );
          setIsProcessing(false);
          return;
        }
      } else {
        // For tokens that support permit (e.g. USDC)
        try {
          let provider = new providers.JsonRpcProvider(
            polygon.rpcUrls.default.http[0]
          );
          if (chainId === 56) {
            provider = new providers.JsonRpcProvider(
              bsc.rpcUrls.default.http[0]
            );
          }

          const permitContract = new Contract(
            tokenAddress,
            getTokenABI(tokenName),
            provider
          );

          const permit = await getPermit(
            { address: account.address! },
            permitContract,
            tokenName,
            chainId,
            papayaAddress, // spender
            depositAmount!.toString(), // amount as string
            (Math.floor(Date.now() / 1000) + 100).toString() // deadline
          );

          const tokenPermit = ethers.solidityPacked(
            ["address", "bytes"],
            [tokenAddress, permit as Address]
          );

          const depositCallData = encodeFunctionData({
            abi,
            functionName: "deposit",
            args: [depositAmount, false],
          });

          const subscribeCallData = encodeFunctionData({
            abi,
            functionName: "subscribe",
            args: [toAddress, subscriptionRate, papayaProjectId],
          });

          const permitAndCallData = encodeFunctionData({
            abi,
            functionName: "permitAndCall",
            args: [tokenPermit, depositCallData],
          });

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

          const bySigCallData = encodeFunctionData({
            abi,
            functionName: "bySig",
            args: [account.address, sponsoredCall, signature],
          });

          writeContract({
            abi,
            address: papayaAddress,
            functionName: "multicall",
            args: [[bySigCallData, subscribeCallData]],
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
      }
    } else {
      // If no deposit is needed, just subscribe.
      writeContract({
        abi,
        address: papayaAddress,
        functionName: "subscribe",
        args: [toAddress, subscriptionRate, papayaProjectId],
      });
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
            {needsDeposit ? "Deposit, Approve & Subscribe" : "Subscribe"}
          </p>
        )}
      </button>
    </form>
  );
};
