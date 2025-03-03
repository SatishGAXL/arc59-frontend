// ConnectWalletModal.js
import React from "react";
import "../styles/ConnectWalletModal.css";
import { Wallet, useWallet } from "@txnlab/use-wallet-react";

// Define the props for the ConnectWalletModal component
const ConnectWalletModal = ({ wallets, isOpen, onClose }: { wallets: Wallet[]; isOpen: boolean; onClose: () => void }) => {
  // If the modal is not open, return null
  if (!isOpen) return null;
  // Access the activeAccount from the useWallet hook
  const { activeAccount } = useWallet();

  // Function to handle wallet connection/activation on click
  const handleWalletClick = async (wallet: Wallet) => {
    // If the wallet is already connected, activate it
    if (wallet.isConnected) {
      wallet.setActive();
    } else {
      // If the wallet is not connected, try to connect
      try {
        const account = await wallet.connect();
        console.log(account);
      } catch (e) {
        console.log(e);
      }
    }
  };

  // Function to disconnect all connected wallets
  const disconnectWallets = async () => {
    wallets.forEach((wallet) => {
      if (wallet.isConnected) {
        wallet.disconnect();
      }
    });
  };

  // Render the modal
  return (
    <div className="overlay" onClick={onClose}>
      {/* Prevent clicks inside the modal from closing it */}
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Connect to a wallet</span>
          {/* Close button */}
          <span className="close-button" onClick={onClose}>
            &times;
          </span>
        </div>

        {/* Map through the wallets and render each wallet option */}
        {wallets.map((wallet) => (
          <div
            onClick={(e) => {
              handleWalletClick(wallet);
            }}
            key={wallet.id}
            className={`wallet-option ${wallet.activeAccount ? "connected" : null}`}
          >
            <span>
              {wallet.metadata.name}{" "}
              {wallet.activeAccount && `[${`${wallet.activeAccount.address.slice(0, 3)}...${wallet.activeAccount.address.slice(-3)}]`}`}{" "}
              {wallet.isActive && `(active)`}
            </span>
            <img src={wallet.metadata.icon} alt={`${wallet.metadata.name} Icon`} className="wallet-icon" />
          </div>
        ))}

        {/* Option to disconnect if a wallet is connected */}
        {activeAccount && (
          <div
            onClick={(e) => {
              disconnectWallets();
            }}
            className={`wallet-option ${activeAccount ? "connected" : null}`}
          >
            <span>Disconnect {activeAccount && `[${`${activeAccount.address.slice(0, 3)}...${activeAccount.address.slice(-3)}`}]`}</span>
          </div>
        )}
        <div className="modal-footer">
          <span>New to Algorand? </span>
          <a href="https://algorand.co/wallets" target="_blank" rel="noopener noreferrer">
            Learn more about wallets
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConnectWalletModal;