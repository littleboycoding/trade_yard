import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { PROGRAM_ID } from "./program";
import { Args, Payload, schema } from "./schema";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { serialize } from "borsh";
import { findItemAddress, findItemMetadataAddress } from "./utils";

async function createSellInstruction(
  seller: PublicKey,
  mint: PublicKey,
  sellerPaymentWallet: PublicKey
) {
  const [itemAddr] = await findItemAddress(mint);
  const [itemMetadataAddr, itemMetadataBump] = await findItemMetadataAddress(
    mint
  );

  const payload = new Payload({
    instruction: 0,
    args: new Args({
      lamports: 1e9,
      metadata_bump: itemMetadataBump,
    }),
  });

  const programItemWallet = await getAssociatedTokenAddress(
    mint,
    itemAddr,
    true
  );

  const data = Buffer.from(serialize(schema, payload));

  const instruction = new TransactionInstruction({
    programId: PROGRAM_ID,
    data,
    keys: [
      {
        pubkey: seller,
        isSigner: true,
        isWritable: true,
      },
      {
        pubkey: programItemWallet,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: mint,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: itemMetadataAddr,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: sellerPaymentWallet,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
    ],
  });

  return instruction;
}

export { createSellInstruction };
