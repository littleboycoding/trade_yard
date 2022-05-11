import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { PROGRAM_ID } from "./program";
import { Args, Payload, schema } from "./schema";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { serialize } from "borsh";
import { findItemAddress, findItemMetadataAddress } from "./utils";
import { Buffer } from "buffer"

/**
 * Create sell instruction
 */
async function createSellInstruction(
  seller: PublicKey,
  mint: PublicKey,
  sellerPaymentWallet: PublicKey,
  lamports: number
) {
  const [itemAddr] = await findItemAddress(mint);
  const [itemMetadataAddr, itemMetadataBump] = await findItemMetadataAddress(
    mint
  );

  const payload = new Payload({
    instruction: 0,
    args: new Args({
      lamports,
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
        isWritable: false,
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

/**
 * Create cancel instruction
 */
async function createCancelInstruction(
  seller: PublicKey,
  mint: PublicKey,
  sellerItemWallet: PublicKey
) {
  const [itemAddr] = await findItemAddress(mint);
  const [itemMetadataAddr] = await findItemMetadataAddress(mint);

  const payload = new Payload({
    instruction: 2,
    args: new Args({
      lamports: null,
      metadata_bump: null,
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
        isWritable: false,
      },
      {
        pubkey: itemMetadataAddr,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: programItemWallet,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: sellerItemWallet,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: itemAddr,
        isSigner: false,
        isWritable: false,
      },
    ],
  });

  return instruction;
}

/**
 * Create buy instruction
 */
async function createBuyInstruction(
  buyer: PublicKey,
  buyerPaymentWallet: PublicKey,
  buyerItemWalelt: PublicKey,
  sellerPaymentWallet: PublicKey,
  mint: PublicKey
) {
  const [itemAddr] = await findItemAddress(mint);
  const [itemMetadataAddr] = await findItemMetadataAddress(mint);

  const payload = new Payload({
    instruction: 1,
    args: new Args({
      lamports: null,
      metadata_bump: null,
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
        pubkey: buyer,
        isSigner: true,
        isWritable: false,
      },
      {
        pubkey: buyerPaymentWallet,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: buyerItemWalelt,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: programItemWallet,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: sellerPaymentWallet,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: itemMetadataAddr,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: itemAddr,
        isSigner: false,
        isWritable: false,
      },
    ],
  });

  return instruction;
}

export { createSellInstruction, createCancelInstruction, createBuyInstruction };
