import React, { useEffect, useRef, useState } from "react";
import { useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { Address, parseUnits } from "viem";
import isEqual from "lodash.isequal";
import Skeleton from "react-loading-skeleton";
import LogoIcon from "../assets/logo.svg";
import SuccessIcon from "../assets/others/success.svg";
import FailIcon from "../assets/others/fail.svg";
import { Approve } from "./Buttons/Approve";
import { Deposit } from "./Buttons/Deposit";
import { Subscribe } from "./Buttons/Subscribe";
import { SubscriptionDetails } from "../types";
import {
  getTokenABI,
  useNetworkFee,
  useSubscriptionModal,
} from "../hook/useSubscriptionModal";
import { Papaya } from "../contracts/evm/Papaya";
import { calculateSubscriptionRate } from "../utils";
import "react-loading-skeleton/dist/skeleton.css";
import "../styles/styles.css";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  subscriptionDetails: SubscriptionDetails;
}

export const SubscriptionModal: React.FC<ModalProps> = ({
  open,
  onClose,
  subscriptionDetails,
}) => {
  const [isSubscriptionSuccessful, setIsSubscriptionSuccessful] =
    useState(false);
  const [showError, setShowError] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorDescription, setErrorDescription] = useState("");

  const account = useAppKitAccount();
  const network = useAppKitNetwork();

  useEffect(() => {
    if (isSubscriptionSuccessful) {
      return;
    }
  }, [isSubscriptionSuccessful]);

  const {
    chainIcon,
    tokenIcon,
    needsDeposit,
    depositAmount,
    needsApproval,
    hasSufficientBalance,
    canSubscribe,
    isUnsupportedNetwork,
    isUnsupportedToken,
    tokenDetails,
  } = useSubscriptionModal(network, account, subscriptionDetails);

  const functionName = needsApproval
    ? "approve"
    : needsDeposit
    ? "deposit"
    : "subscribe";

  const abi =
    functionName == "approve" ? getTokenABI(tokenDetails.name) : Papaya;
  const address =
    functionName == "approve"
      ? tokenDetails.ercAddress
      : tokenDetails.papayaAddress;
  const args = needsApproval
    ? [
        tokenDetails.papayaAddress as Address,
        parseUnits(subscriptionDetails.cost, 6),
      ]
    : needsDeposit
    ? [depositAmount, false]
    : [
        subscriptionDetails.toAddress as Address,
        calculateSubscriptionRate(
          parseUnits(subscriptionDetails.cost, 18),
          subscriptionDetails.payCycle
        ),
        0,
      ];

  function useDeepMemo<T>(value: T): T {
    const ref = useRef<T | undefined>(undefined);
    if (!isEqual(ref.current, value)) {
      ref.current = value;
    }
    return ref.current as T;
  }

  const functionDetails = useDeepMemo({
    abi,
    address: address as Address,
    functionName,
    args,
    account: account.address as Address,
  });

  const { networkFee, isLoading: isFeeLoading } = useNetworkFee(
    open,
    account,
    network.chainId as number,
    functionDetails
  );

  useEffect(() => {
    if (isUnsupportedNetwork || isUnsupportedToken) {
      setShowError(true);
      if (isUnsupportedNetwork && !isUnsupportedToken) {
        setErrorTitle("Unsupported network");
        setErrorDescription(
          "The selected network is not supported. Please switch to a supported network."
        );
      } else if (!isUnsupportedToken && isUnsupportedToken) {
        setErrorTitle("Unsupported token");
        setErrorDescription(
          "The selected token is not supported on this network. Please select a different token."
        );
      } else {
        setErrorTitle("Unsupported network and token");
        setErrorDescription("The selected network and token is not supported.");
      }
    } else {
      setShowError(false);
      setErrorTitle("");
      setErrorDescription("");
    }
  }, [isUnsupportedNetwork, isUnsupportedToken]);

  useEffect(() => {
    if (!open) {
      setIsSubscriptionSuccessful(false);
      setShowError(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-container">
            <div className="wallet-section">
              {React.createElement("appkit-button")}
            </div>
            <div className="close-button" onClick={onClose}>
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M13.4032 11.9942L17.6976 7.7095C18.0892 7.31787 18.0892 6.68289 17.6976 6.29126C17.306 5.89962 16.671 5.89962 16.2794 6.29126L11.995 10.5859L7.71063 6.29126C7.31902 5.89962 6.68409 5.89962 6.29248 6.29126C5.90087 6.68289 5.90087 7.31787 6.29248 7.7095L10.5869 11.9942L6.29248 16.2789C6.10342 16.4664 5.99707 16.7217 5.99707 16.988C5.99707 17.2543 6.10342 17.5096 6.29248 17.6972C6.48 17.8862 6.73527 17.9926 7.00155 17.9926C7.26784 17.9926 7.52311 17.8862 7.71063 17.6972L11.995 13.4025L16.2794 17.6972C16.4669 17.8862 16.7222 17.9926 16.9885 17.9926C17.2548 17.9926 17.51 17.8862 17.6976 17.6972C17.8866 17.5096 17.993 17.2543 17.993 16.988C17.993 16.7217 17.8866 16.4664 17.6976 16.2789L13.4032 11.9942Z"
                  fill="#212B36"
                />
              </svg>
            </div>
          </div>
        </div>
        <div className="modal-body">
          <div
            className={`modal-body-container body-main ${
              showError || isSubscriptionSuccessful ? "hidden" : ""
            }`}
          >
            <div className="summary-section">
              <p className="summary-title">Summary</p>
              <div className="summary-detail">
                <p className="detail-label">Subscription Cost:</p>
                <div className="detail-icons">
                  <img
                    src={chainIcon}
                    alt="Chain Icon"
                    className="chain-icon"
                  />
                  <img
                    src={tokenIcon}
                    alt="Token Icon"
                    className="token-icon"
                  />
                </div>
                <p className="detail-value">
                  {isFeeLoading ? (
                    <Skeleton width={80} />
                  ) : (
                    subscriptionDetails.cost
                  )}
                </p>
                <p className="detail-usd-value">
                  {isFeeLoading ? (
                    <Skeleton width={60} />
                  ) : (
                    `(~$${subscriptionDetails.cost})`
                  )}
                </p>
                <p className="detail-pay-cycle">
                  {subscriptionDetails.payCycle}
                </p>
              </div>
              <div className="summary-detail">
                <p className="detail-label">Network Fee:</p>
                <p className="detail-value">
                  {isFeeLoading ? <Skeleton width={80} /> : networkFee?.fee}
                </p>
                <p className="detail-usd-value">
                  {isFeeLoading ? (
                    <Skeleton width={60} />
                  ) : (
                    networkFee?.usdValue
                  )}
                </p>
              </div>
            </div>
            <Approve
              chainId={network.chainId as number}
              needsApproval={needsApproval}
              approvalAmount={parseUnits(subscriptionDetails.cost, 6)}
              abi={getTokenABI(tokenDetails.name)}
              tokenContractAddress={tokenDetails.ercAddress as Address}
              papayaAddress={tokenDetails.papayaAddress as Address}
              onSuccess={() => {
                setShowError(false);
                setErrorTitle("Token approval failed");
                setErrorDescription("");
              }}
              onError={(title, description) => {
                setShowError(true);
                setErrorTitle(title);
                setErrorDescription(description);
              }}
            />
            <Deposit
              chainId={network.chainId as number}
              needsDeposit={needsDeposit}
              depositAmount={depositAmount}
              abi={Papaya}
              papayaAddress={tokenDetails.papayaAddress as Address}
              hasSufficientBalance={hasSufficientBalance}
              onSuccess={() => {
                setShowError(false);
                setErrorTitle("");
                setErrorDescription("");
              }}
              onError={(title, description) => {
                setShowError(true);
                setErrorTitle(title);
                setErrorDescription(description);
              }}
            />
            <Subscribe
              chainId={network.chainId as number}
              needsDeposit={needsDeposit}
              canSubscribe={canSubscribe}
              abi={Papaya}
              toAddress={subscriptionDetails.toAddress as Address}
              subscriptionCost={parseUnits(subscriptionDetails.cost, 18)}
              subscriptionCycle={subscriptionDetails.payCycle}
              papayaAddress={tokenDetails.papayaAddress as Address}
              onSuccess={() => {
                setIsSubscriptionSuccessful(() => {
                  return true;
                });
                setShowError(false);
                setErrorTitle("");
                setErrorDescription("");
              }}
              onError={(title, description) => {
                setShowError(true);
                setErrorTitle(title);
                setErrorDescription(description);
              }}
            />
          </div>
          {showError && !isSubscriptionSuccessful && (
            <div className="modal-body-container body-error">
              <div className="error-section">
                <img
                  src={FailIcon}
                  alt="Subscription Failed"
                  className="fail-icon"
                />
                <p className="error-title">{errorTitle}</p>
                <p className="error-text">{errorDescription}</p>
              </div>
            </div>
          )}
          {!showError && isSubscriptionSuccessful && (
            <div className="modal-body-container body-successful">
              <div className="successful-section">
                <img
                  src={SuccessIcon}
                  alt="Subscription Successful"
                  className="success-icon"
                />
                <p className="thank-you-title">
                  Thank you for your subscription!
                </p>
                <p className="thank-you-text">
                  Now you can manage your subscription from a convenient{" "}
                  <b>
                    <u>
                      <a
                        target="_blank"
                        href={
                          account && account.address
                            ? `https://app.papaya.finance/wallet/${account.address}`
                            : "https://app.papaya.finance/"
                        }
                      >
                        dashboard
                      </a>
                    </u>
                  </b>
                  !
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <p className="footer-text">Powered by</p>
          <a
            href="https://app.papaya.finance"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={LogoIcon} alt="Papaya Logo" className="footer-logo" />
          </a>
        </div>
      </div>
    </div>
  );
};
