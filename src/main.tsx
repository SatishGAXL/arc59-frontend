import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Importing necessary modules from the @txnlab/use-wallet-react library
import { NetworkId, WalletId, WalletManager, WalletProvider } from "@txnlab/use-wallet-react";

// Creating a new WalletManager instance with specified configurations
const walletManager = new WalletManager({
  // Defining the wallets to be used
  wallets: [
    WalletId.DEFLY, // Defly wallet
    WalletId.PERA, // Pera wallet
    WalletId.EXODUS, // Exodus wallet
    {
      // WalletConnect wallet with a project ID
      id: WalletId.WALLETCONNECT,
      options: { projectId: "0af28c6c83a29810852e9405b1d7fee7" },
    },
    {
      // Lute wallet with a site name
      id: WalletId.LUTE,
      options: { siteName: "ARC59 Frontend" },
    },
  ],
  // Setting the network to TestNet
  network: NetworkId.TESTNET,
});

// Rendering the React application
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* Wrapping the App component with WalletProvider to manage wallet connections */}
    <WalletProvider manager={walletManager}>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
