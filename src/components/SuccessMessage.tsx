import React from "react";
import "./styles.css";

interface SuccessMessageProps {
  onClose: () => void;
}

export const SuccessMessage: React.FC<SuccessMessageProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal success-modal">
        <div className="success-icon">✅</div>
        <h2>Thank you for your subscription!</h2>
        <p>Now you can manage your subscription from a convenient dashboard!</p>
        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};
