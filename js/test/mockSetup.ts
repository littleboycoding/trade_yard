import {
  Connection,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  PublicKey,
} from "@solana/web3.js";
import {
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
import { findItemAddress } from "../src/utils";

/**
 * Mock which setup necessary stuff like initializing mint account, minting, prepare program account and more
 */
async function mockSetup(
  connection: Connection
): Promise<[Keypair[], PublicKey[]]> {
  const seller = new Keypair();
  const mint = new Keypair();
  const payment = new Keypair();
  const buyer = new Keypair();

  await Promise.all([
    connection
      .requestAirdrop(seller.publicKey, 1e11)
      .then((sig) => connection.confirmTransaction(sig)),
    connection
      .requestAirdrop(buyer.publicKey, 1e11)
      .then((sig) => connection.confirmTransaction(sig)),
  ]);

  const [itemAddr] = await findItemAddress(mint.publicKey);

  const MINT_RENT = await getMinimumBalanceForRentExemptMint(connection);

  const [
    sellerItemWallet,
    sellerPaymentWallet,
    buyerItemWallet,
    buyerPaymentWallet,
    programItemWallet,
  ] = await Promise.all([
    getAssociatedTokenAddress(mint.publicKey, seller.publicKey),
    getAssociatedTokenAddress(payment.publicKey, seller.publicKey),
    getAssociatedTokenAddress(mint.publicKey, buyer.publicKey),
    getAssociatedTokenAddress(payment.publicKey, buyer.publicKey),
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
    createInitializeMintInstruction(mint.publicKey, 0, seller.publicKey, null),
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
    createAssociatedTokenAccountInstruction(
      seller.publicKey,
      buyerItemWallet,
      buyer.publicKey,
      mint.publicKey
    ),
    createAssociatedTokenAccountInstruction(
      seller.publicKey,
      buyerPaymentWallet,
      buyer.publicKey,
      payment.publicKey
    ),
    createMintToInstruction(
      mint.publicKey,
      sellerItemWallet,
      seller.publicKey,
      1
    ),
    createMintToInstruction(
      payment.publicKey,
      buyerPaymentWallet,
      seller.publicKey,
      1e9
    ),
    createSetAuthorityInstruction(
      mint.publicKey,
      seller.publicKey,
      AuthorityType.MintTokens,
      null
    )
  );

  await sendAndConfirmTransaction(connection, transaction, [
    seller,
    mint,
    payment,
  ]);

  return [
    [seller, mint, payment, buyer],
    [
      sellerItemWallet,
      sellerPaymentWallet,
      buyerItemWallet,
      buyerPaymentWallet,
      programItemWallet,
    ],
  ];
}

export default mockSetup;
