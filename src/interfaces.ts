// Interface for representing an asset holding
export interface AssetHolding {
  assetId: number; // The ID of the asset
  orgAmount: number; // The original amount of the asset held
}

// Interface for representing detailed asset information, extending AssetHolding
export interface AssetDetails extends AssetHolding {
  amount: number; // The amount of the asset, adjusted for decimals
  decimals: number; // The number of decimals for the asset
  name: string; // The name of the asset
  unitName: string; // The unit name of the asset
}