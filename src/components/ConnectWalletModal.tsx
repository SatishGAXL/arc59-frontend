// ConnectWalletModal.js
import React from "react";
import "../styles/ConnectWalletModal.css";
import { Wallet, useWallet } from "@txnlab/use-wallet-react";

const ConnectWalletModal = ({ wallets, isOpen, onClose }: { wallets: Wallet[]; isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  const { activeAccount } = useWallet();

  const handleWalletClick = async (wallet: Wallet) => {
    if (wallet.isConnected) {
      wallet.setActive();
    } else {
      try {
        const account = await wallet.connect();
        console.log(account);
      } catch (e) {
        console.log(e);
      }
    }
  };

  const disconnectWallets = async () => {
    wallets.forEach((wallet) => {
      if (wallet.isConnected) {
        wallet.disconnect();
      }
    });
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Connect to a wallet</span>
          <span className="close-button" onClick={onClose}>
            &times;
          </span>
        </div>

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