import { Algodv2, Indexer, Transaction } from "algosdk";
import { indexerPort, indexerToken, indexerUrl } from "./constants";
import { AssetDetails, AssetHolding } from "./interfaces";
import algosdk from "algosdk";
import { Arc59Client } from "./contracts/Arc59Client";
import { NetworkId } from "@txnlab/use-wallet-react";

export const getAssetsInAddress = async (address: string) => {
  const indexer = new Indexer(indexerToken, indexerUrl, indexerPort);
  let assets = await indexer.lookupAccountAssets(address).do();
  let threshold = 1000;
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
  const filtered: AssetHolding[] = assets.assets.map((asset: any) => {
    return {
      assetId: asset["asset-id"],
      orgAmount: asset.amount,
      type: "asset",
    };
  });
  return filtered;
};

export const getAssetDetails = async (
  asset: AssetHolding
): Promise<AssetDetails> => {
  const indexer = new Indexer(indexerToken, indexerUrl, indexerPort);
  const assetDetails = await indexer.lookupAssetByID(asset.assetId).do();
  return {
    assetId: asset.assetId,
    amount: asset.orgAmount / 10 ** assetDetails.asset.params.decimals,
    orgAmount: asset.orgAmount,
    decimals: assetDetails.asset.params.decimals,
    name: base64ToString(assetDetails.asset.params["name-b64"]),
    unitName: base64ToString(assetDetails.asset.params["unit-name-b64"]),
  };
};

export const stringToBase64 = (input: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  return btoa(String.fromCharCode(...bytes));
};

export const base64ToString = (input: string): string => {
  const binary = atob(input);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
};

type SenderType = {
  addr: string;
  signer: (
    txnGroup: algosdk.Transaction[],
    indexesToSign: number[]
  ) => Promise<Uint8Array[]>;
};

export const createArc59GroupTxns = async (
  txn: { assetId: number; amount: number; receiver: string }[],
  sender: SenderType,
  algodClient: Algodv2,
  activeNetwork: NetworkId
) => {
  try {
    const appClient = new Arc59Client(
      {
        sender,
        resolveBy: "id",
        id: activeNetwork === "mainnet" ? 2449590623 : 643020148,
      },
      algodClient
    );

    const simSender = {
      addr: sender.addr,
      signer: algosdk.makeEmptyTransactionSigner(),
    };
    const simParams = {
      allowEmptySignatures: true,
      allowUnnamedResources: true,
      fixSigners: true,
    };
    for (let i = 0; i < txn.length; i++) {
      const suggestedParams = await algodClient.getTransactionParams().do();
      const composer = appClient.compose();
      const appAddr = (await appClient.appClient.getAppReference()).appAddress;
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
