export interface AssetHolding {
  assetId: number;
  orgAmount: number;
}

export interface AssetDetails extends AssetHolding {
  amount: number;
  decimals: number;
  name: string;
  unitName: string;
}

export interface LimitOrder {
  id: BigInt;
  owner: string;
  givingAsset: AssetDetails;
  takingAsset: AssetDetails;
  givingAmount: BigInt;
  takingAmount: BigInt;
  completed: boolean;
  ownerClaimed: boolean;
  canAbleToBuy: boolean;
  isOwner: boolean;
}
export interface AssetHolding {
  assetId: number;
  orgAmount: number;
}

export interface AssetDetails extends AssetHolding {
  amount: number;
  decimals: number;
  name: string;
  unitName: string;
}

export interface LimitOrder {
  id: BigInt;
  owner: string;
  givingAsset: AssetDetails;
  takingAsset: AssetDetails;
  givingAmount: BigInt;
  takingAmount: BigInt;
  completed: boolean;
  ownerClaimed: boolean;
  canAbleToBuy: boolean;
  isOwner: boolean;
}
