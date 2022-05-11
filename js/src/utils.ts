import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./program";
import { Buffer } from "buffer"

function findItemAddress(mint: PublicKey) {
  return PublicKey.findProgramAddress(
    [Buffer.from("item"), mint.toBytes()],
    PROGRAM_ID
  );
}

function findItemMetadataAddress(mint: PublicKey) {
  return PublicKey.findProgramAddress(
    [Buffer.from("item_metadata"), mint.toBytes()],
    PROGRAM_ID
  );
}

export { findItemAddress, findItemMetadataAddress };
