import { Algodv2, Indexer, Transaction } from "algosdk";
import { indexerPort, indexerToken, indexerUrl } from "./constants";
import { AssetDetails, AssetHolding } from "./interfaces";
import algosdk from "algosdk";
import { Arc59Client } from "./contracts/Arc59Client";
import { NetworkId } from "@txnlab/use-wallet-react";

// Function to retrieve all assets held by a given address
export const getAssetsInAddress = async (address: string) => {
  // Initialize the indexer client
  const indexer = new Indexer(indexerToken, indexerUrl, indexerPort);
  // Retrieve assets for the given address
  let assets = await indexer.lookupAccountAssets(address).do();
  let threshold = 1000;
  // Handle pagination if the number of assets exceeds the threshold
  while (assets.assets.length === threshold && assets["next-token"]) {
    const nextToken = assets["next-token"];
    const nextResponse = await indexer
      .lookupAccountAssets(address)
      .nextToken(nextToken)
      .do();
    assets.assets = assets.assets.concat(nextResponse.assets);
    assets["next-token"] = nextResponse["next-token"];
    threshold += 1000;
  }
  // Map the assets to the AssetHolding interface
  const filtered: AssetHolding[] = assets.assets.map((asset: any) => {
    return {
      assetId: asset["asset-id"],
      orgAmount: asset.amount,
      type: "asset",
    };
  });
  return filtered;
};

// Function to retrieve details for a given asset
export const getAssetDetails = async (
  asset: AssetHolding
): Promise<AssetDetails> => {
  // Initialize the indexer client
  const indexer = new Indexer(indexerToken, indexerUrl, indexerPort);
  // Retrieve asset details by asset ID
  const assetDetails = await indexer.lookupAssetByID(asset.assetId).do();
  // Return the asset details
  return {
    assetId: asset.assetId,
    amount: asset.orgAmount / 10 ** assetDetails.asset.params.decimals,
    orgAmount: asset.orgAmount,
    decimals: assetDetails.asset.params.decimals,
    name: base64ToString(assetDetails.asset.params["name-b64"]),
    unitName: base64ToString(assetDetails.asset.params["unit-name-b64"]),
  };
};

// Function to encode a string to base64
export const stringToBase64 = (input: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  return btoa(String.fromCharCode(...bytes));
};

// Function to decode a base64 string to a string
export const base64ToString = (input: string): string => {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

// Type definition for the sender
type SenderType = {
  addr: string;
  signer: (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>;
};

// Function to create a group of transactions for ARC59
export const createArc59GroupTxns = async (
  txn: { assetId: number; amount: number; receiver: string }[],
  sender: SenderType,
  algodClient: Algodv2,
  activeNetwork: NetworkId
) => {
  try {
    // Initialize the ARC59 client
    const appClient = new Arc59Client(
      {
        sender,
        resolveBy: "id",
        id: activeNetwork === "mainnet" ? 2449590623 : 643020148,
      },
      algodClient
    );

    // Define a simulated sender with an empty transaction signer
    const simSender = {
      addr: sender.addr,
      signer: algosdk.makeEmptyTransactionSigner(),
    };
    // Define simulation parameters
    const simParams = {
      allowEmptySignatures: true,
      allowUnnamedResources: true,
      fixSigners: true,
    };
    // Iterate over each transaction in the array
    for (let i = 0; i < txn.length; i++) {
      // Get suggested transaction parameters
      const suggestedParams = await algodClient.getTransactionParams().do();
      // Create a composer instance
      const composer = appClient.compose();
      // Get the application address
      const appAddr = (await appClient.appClient.getAppReference()).appAddress;
      // Get the receiver address
      const receiver = txn[i].receiver;
      console.log((
        await appClient
          .compose()
          .arc59GetSendAssetInfo(
            {
              asset: txn[i].assetId,
              receiver: receiver,
            },
            {
              sender: {
                ...simSender,
                addr: sender.addr,
              },
            }
          )
          .simulate(simParams)
      ).returns)
      // Get information about sending the asset using a simulation
      const [
        itxns,
        mbr,
        routerOptedIn,
        _receiverOptedIn,
        receiverAlgoNeededForClaim,
      ] = (
        await appClient
          .compose()
          .arc59GetSendAssetInfo(
            {
              asset: txn[i].assetId,
              receiver: receiver,
            },
            {
              sender: {
                ...simSender,
                addr: sender.addr,
              },
            }
          )
          .simulate(simParams)
      ).returns[0];

      console.log("itxns: ", itxns);

      if (_receiverOptedIn) {
        console.log("Receiver is opted in");
      }

      if (mbr || receiverAlgoNeededForClaim) {
        // If the MBR is non-zero, send the MBR to the router
        const mbrPayment = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          to: appAddr,
          from: sender.addr,
          suggestedParams,
          amount: Number(mbr + receiverAlgoNeededForClaim),
        });
        composer.addTransaction({
          txn: mbrPayment,
          signer: sender.signer,
        });
      }

      // If the router is not opted in, add a call to arc59OptRouterIn to do so
      if (!routerOptedIn) composer.arc59OptRouterIn({ asa: txn[i].assetId });

      // The transfer of the asset to the router
      const assetTransfer =
        algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          to: appAddr,
          from: sender.addr,
          assetIndex: txn[i].assetId,
          amount: txn[i].amount,
          suggestedParams,
        });

      // An extra itxn is if we are also sending ALGO for the receiver claim
      const totalItxns = itxns + (receiverAlgoNeededForClaim === 0n ? 0n : 1n);

      const fee = (
        algosdk.ALGORAND_MIN_TX_FEE * Number(totalItxns + 1n)
      ).microAlgos();
      const boxes = [algosdk.decodeAddress(receiver).publicKey];
      const inboxAddress = (
        await appClient
          .compose()
          .arc59GetInbox({ receiver: receiver }, { sender: simSender })
          .simulate(simParams)
      ).returns[0];

      const accounts = [receiver, inboxAddress];
      const assets = [Number(txn[i].assetId)];
      composer.arc59SendAsset(
        {
          axfer: assetTransfer,
          receiver: receiver,
          additionalReceiverFunds: receiverAlgoNeededForClaim,
        },
        { sendParams: { fee }, boxes, accounts, assets }
      );

      // get the atomic transaction composer
      const atc = await composer.atc();
      await atc.gatherSignatures();
      const result = await atc.submit(algodClient);
      console.log("result: ", result);
    }
  } catch (e) {
    console.error(e);
    throw e;
  }
};
