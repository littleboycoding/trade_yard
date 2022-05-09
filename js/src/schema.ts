import { PublicKey } from "@solana/web3.js";
import type BN from "bn.js"

class Payload {
  instruction: number;
  args: Args;

  constructor(data: { instruction: number; args: Args }) {
    this.instruction = data.instruction;
    this.args = data.args;
  }
}

class Args {
  lamports: null | number;
  metadata_bump: null | number;

  constructor(data: { lamports: null | number; metadata_bump: null | number }) {
    this.lamports = data.lamports;
    this.metadata_bump = data.metadata_bump;
  }
}

class ItemMetadata {
  seller: PublicKey;
  mint: PublicKey;
  lamports: BN;
  payment: PublicKey;
  item: PublicKey;
  constructor(data: {
    seller: Uint8Array | PublicKey;
    mint: Uint8Array | PublicKey;
    lamports: BN;
    payment: Uint8Array | PublicKey;
    item: Uint8Array | PublicKey;
  }) {
    this.seller =
      data.seller instanceof Uint8Array
        ? new PublicKey(data.seller)
        : data.seller;

    this.mint =
      data.mint instanceof Uint8Array ? new PublicKey(data.mint) : data.mint;

    this.lamports = data.lamports;

    this.payment =
      data.payment instanceof Uint8Array
        ? new PublicKey(data.payment)
        : data.payment;

    this.item =
      data.item instanceof Uint8Array ? new PublicKey(data.item) : data.item;
  }
}

const schema = new Map<new (args: any) => any, any>([
  [
    Payload,
    {
      kind: "struct",
      fields: [
        ["instruction", "u8"],
        ["args", Args],
      ],
    },
  ],
  [
    Args,
    {
      kind: "struct",
      fields: [
        [
          "lamports",
          {
            kind: "option",
            type: "u64",
          },
        ],
        [
          "metadata_bump",
          {
            kind: "option",
            type: "u8",
          },
        ],
      ],
    },
  ],
  [
    ItemMetadata,
    {
      kind: "struct",
      fields: [
        ["seller", [32]],
        ["mint", [32]],
        ["lamports", "u64"],
        ["payment", [32]],
        ["item", [32]],
      ],
    },
  ],
]);

export { Payload, Args, ItemMetadata, schema };
