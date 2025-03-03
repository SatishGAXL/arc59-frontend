import { NetworkId, useWallet } from "@txnlab/use-wallet-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useEffect, useState } from "react";
import "./styles/Header.css";
import ConnectWalletModal from "./components/ConnectWalletModal";
import * as algokit from "@algorandfoundation/algokit-utils";
import algosdk, { AtomicTransactionComposer } from "algosdk";
import {
  createArc59GroupTxns,
  getAssetDetails,
  getAssetsInAddress,
} from "./utils";
import { AssetDetails } from "./interfaces";

// Initialize Algorand client for testnet
const algorandClient = algokit.AlgorandClient.testNet();

const App = () => {
  // Access wallet functionalities and account information
  const { wallets, activeAccount, transactionSigner, activeNetwork } =
    useWallet();
  // State variables
  const [assetAmount, setAssetAmount] = useState(0);
  const [assetReceiver, setAssetReceiver] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userAssets, setUserAssets] = useState<AssetDetails[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetails>();
  const [isSending, setIsSending] = useState("");

  // Function to get user assets
  async function getUserAssets(address: string) {
    let assets = await getAssetsInAddress(address);
    let finalAssets: AssetDetails[] = [];
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const assetDetails = await getAssetDetails(asset);
      finalAssets.push(assetDetails);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    setUserAssets(finalAssets);
    console.log(finalAssets);
    return finalAssets;
  }

  // useEffect hook to fetch user assets when the active account changes
  useEffect(() => {
    (async () => {
      let finalAssets: AssetDetails[] = [];
      if (activeAccount) {
        finalAssets = await getUserAssets(activeAccount.address);
      }
    })();
  }, [activeAccount]);

  // Function to send asset
  const sendAsset = async () => {
    if (!activeAccount) {
      toast.error("Please connect wallet");
      return;
    }
    if (!selectedAsset) {
      toast.error("Please select an asset");
      return;
    }
    if (assetAmount <= 0 || assetAmount > selectedAsset.amount) {
      toast.error("Invalid asset amount");
      return;
    }
    if (algosdk.isValidAddress(assetReceiver) === false) {
      toast.error("Invalid receiver address");
      return;
    }

    console.log(activeNetwork, ">>>");
    setIsSending("Sending...");
    try {
      await createArc59GroupTxns(
        [
          {
            assetId: selectedAsset.assetId,
            amount: assetAmount*10**selectedAsset.decimals,
            receiver: assetReceiver,
          },
        ],
        { addr: activeAccount.address, signer: transactionSigner },
        algorandClient.client.algod,
        activeNetwork
      );
      toast.success("Asset sent successfully");
      window.location.reload();
    } catch (e: any) {
      console.log(e);
      toast.error(`Error sending asset: ${e.message}`);
    } finally {
      setIsSending("");
    }
  };

  return (
    <>
      <>
        <section className="header_section" id="header_section">
          <div className="sticky_nav">
            <a className="cmpny_name">ARC59 Frontend</a>
          </div>
          <div className="header_wrapper">
            <div className="second_wrap">
              <button
                onClick={() => setIsModalOpen(true)}
                className="connect_wallet_btn"
              >
                {activeAccount
                  ? `Connected as ${activeAccount.address.slice(
                      0,
                      3
                    )}...${activeAccount.address.slice(-3)}`
                  : "Connect Wallet"}
              </button>
            </div>
            <div className="first_wrap">
              <div className="input_wrap">
                <label>Asset</label>
                <select
                  onChange={(e) =>
                    setSelectedAsset(userAssets[Number(e.target.value)])
                  }
                >
                  <option value={-1}>Select Asset</option>
                  {userAssets.map((asset, index) => (
                    <option value={index} key={index}>
                      {asset.name} [{asset.amount} {asset.unitName}]
                    </option>
                  ))}
                </select>
              </div>
              <div className="input_wrap">
                <label>Asset Amount</label>
                <input
                  value={assetAmount}
                  onChange={(e) => setAssetAmount(parseInt(e.target.value))}
                  type="number"
                />
              </div>
            </div>
            <div className="first_wrap">
              <div className="input_wrap">
                <label>Asset Receiver</label>
                <input
                  value={assetReceiver}
                  onChange={(e) => setAssetReceiver(e.target.value)}
                  type="text"
                />
              </div>
            </div>
            <div className="first_wrap">
              <button
                disabled={isSending === "" ? false : true}
                onClick={sendAsset}
                className="fetch_asset_btn"
              >
                {isSending === "" ? "Send Asset" : isSending}
              </button>
            </div>
          </div>
        </section>

        <ConnectWalletModal
          wallets={wallets}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </>
    </>
  );
};

export default App;
