import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  AuthorityType,
  createInitializeMintInstruction,
  createMintToInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
} from "@solana/spl-token";
import { createSellInstruction } from "../src/instruction";
import { findItemAddress } from "../src/utils";

const CLUSTER_API = "http://localhost:8899";

describe("Trade Yard", () => {
  let connection: Connection;

  let seller: Keypair;
  let sellerItemWallet: PublicKey;
  let sellerPaymentWallet: PublicKey;

  let mint: Keypair;
  let payment: Keypair;

  let programItemWallet: PublicKey;

  beforeAll(() => {
    connection = new Connection(CLUSTER_API, "confirmed");
  });

  beforeEach(async () => {
    seller = new Keypair();
    mint = new Keypair();
    payment = new Keypair();

    await connection
      .requestAirdrop(seller.publicKey, 1e11)
      .then((sig) => connection.confirmTransaction(sig));

    const [itemAddr] = await findItemAddress(mint.publicKey);

    const MINT_RENT = await getMinimumBalanceForRentExemptMint(connection);

    [sellerItemWallet, sellerPaymentWallet, programItemWallet] =
      await Promise.all([
        getAssociatedTokenAddress(mint.publicKey, seller.publicKey),
        getAssociatedTokenAddress(payment.publicKey, seller.publicKey),
        getAssociatedTokenAddress(mint.publicKey, itemAddr, true),
      ]);

    const transaction = new Transaction();

    transaction.add(
      SystemProgram.createAccount({
        programId: TOKEN_PROGRAM_ID,
        space: MINT_SIZE,
        lamports: MINT_RENT,
        fromPubkey: seller.publicKey,
        newAccountPubkey: mint.publicKey,
      }),
      SystemProgram.createAccount({
        programId: TOKEN_PROGRAM_ID,
        space: MINT_SIZE,
        lamports: MINT_RENT,
        fromPubkey: seller.publicKey,
        newAccountPubkey: payment.publicKey,
      }),
      createInitializeMintInstruction(
        mint.publicKey,
        0,
        seller.publicKey,
        null
      ),
      createInitializeMintInstruction(
        payment.publicKey,
        9,
        seller.publicKey,
        null
      ),
      createAssociatedTokenAccountInstruction(
        seller.publicKey,
        programItemWallet,
        itemAddr,
        mint.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        seller.publicKey,
        sellerItemWallet,
        seller.publicKey,
        mint.publicKey
      ),
      createAssociatedTokenAccountInstruction(
        seller.publicKey,
        sellerPaymentWallet,
        seller.publicKey,
        payment.publicKey
      ),
      createMintToInstruction(
        mint.publicKey,
        sellerItemWallet,
        seller.publicKey,
        1
      ),
      createSetAuthorityInstruction(
        mint.publicKey,
        seller.publicKey,
        AuthorityType.MintTokens,
        null
      )
    );

    return sendAndConfirmTransaction(connection, transaction, [
      seller,
      mint,
      payment,
    ]);
  });

  test("Selling", async () => {
    const transaction = new Transaction();

    transaction.add(
      createTransferInstruction(
        sellerItemWallet,
        programItemWallet,
        seller.publicKey,
        1
      ),
      await createSellInstruction(
        seller.publicKey,
        mint.publicKey,
        sellerPaymentWallet
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [seller]);
  });

  test.todo("Canceling");
  test.todo("Buying");
});
