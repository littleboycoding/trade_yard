import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createTransferInstruction } from "@solana/spl-token";
import {
  createCancelInstruction,
  createSellInstruction,
  createBuyInstruction,
} from "../src/instruction";
import mockSetup from "./mockSetup";
import { findItemMetadataAddress } from "../src/utils";
import { deserialize } from "borsh";
import { ItemMetadata, schema } from "../src/schema";

const CLUSTER_API = "http://localhost:8899";

describe("Trade Yard", () => {
  let connection: Connection;

  // Accounts
  let seller: Keypair;
  let buyer: Keypair;

  // Wallets
  let sellerItemWallet: PublicKey;
  let sellerPaymentWallet: PublicKey;
  let buyerItemWallet: PublicKey;
  let buyerPaymentWallet: PublicKey;
  let programItemWallet: PublicKey;

  // SPL-Token
  let mint: Keypair;
  let payment: Keypair;

  beforeAll(() => {
    connection = new Connection(CLUSTER_API, "confirmed");
  });

  beforeEach(async () => {
    [
      [seller, mint, payment, buyer],
      [
        sellerItemWallet,
        sellerPaymentWallet,
        buyerItemWallet,
        buyerPaymentWallet,
        programItemWallet,
      ],
    ] = await mockSetup(connection);
  });

  test("Selling", async () => {
    const SELL_PRICE = 1e9;

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
        sellerPaymentWallet,
        SELL_PRICE
      )
    );

    await sendAndConfirmTransaction(connection, transaction, [seller]);

    // Expecting
    const [sellerItemWalletBalance, programItemWalletBalance] =
      await Promise.all([
        connection
          .getTokenAccountBalance(sellerItemWallet)
          .then((r) => r.value.amount),
        connection
          .getTokenAccountBalance(programItemWallet)
          .then((r) => r.value.amount),
      ]);

    const itemMetadataData = await findItemMetadataAddress(mint.publicKey).then(
      ([addr]) => connection.getAccountInfo(addr)
    );

    if (!itemMetadataData?.data) throw new Error("No data associated");
    const metadata = deserialize(schema, ItemMetadata, itemMetadataData.data);

    expect(sellerItemWalletBalance).toEqual("0");
    expect(programItemWalletBalance).toEqual("1");

    expect(metadata.seller).toEqual(seller.publicKey);
    expect(metadata.mint).toEqual(mint.publicKey);
    expect(metadata.payment).toEqual(sellerPaymentWallet);
    expect(metadata.item).toEqual(programItemWallet);
    expect(metadata.lamports.toString()).toEqual(SELL_PRICE.toString());
  });

  test("Canceling", async () => {
    const SELL_PRICE = 1e9;

    // Setup selling item
    const sellingTransaction = new Transaction();

    sellingTransaction.add(
      createTransferInstruction(
        sellerItemWallet,
        programItemWallet,
        seller.publicKey,
        1
      ),
      await createSellInstruction(
        seller.publicKey,
        mint.publicKey,
        sellerPaymentWallet,
        SELL_PRICE
      )
    );

    await sendAndConfirmTransaction(connection, sellingTransaction, [seller]);

    // Canceling
    const cancelingTransaction = new Transaction();

    cancelingTransaction.add(
      await createCancelInstruction(
        seller.publicKey,
        mint.publicKey,
        sellerItemWallet
      )
    );

    await sendAndConfirmTransaction(connection, cancelingTransaction, [seller]);

    const [sellerItemWalletBalance, programItemWalletBalance] =
      await Promise.all([
        connection
          .getTokenAccountBalance(sellerItemWallet)
          .then((r) => r.value.amount),
        connection
          .getTokenAccountBalance(programItemWallet)
          .then((r) => r.value.amount),
      ]);

    const [itemMetadataAddr] = await findItemMetadataAddress(
      mint.publicKey
    ).then();

    const itemMetadata = await connection.getAccountInfo(itemMetadataAddr);

    expect(sellerItemWalletBalance).toEqual("1");
    expect(programItemWalletBalance).toEqual("0");

    expect(itemMetadata).toBeNull();
  });

  test("Buying", async () => {
    const SELL_PRICE = 1e9;

    // Setup selling item
    const sellingTransaction = new Transaction();

    sellingTransaction.add(
      createTransferInstruction(
        sellerItemWallet,
        programItemWallet,
        seller.publicKey,
        1
      ),
      await createSellInstruction(
        seller.publicKey,
        mint.publicKey,
        sellerPaymentWallet,
        SELL_PRICE
      )
    );

    await sendAndConfirmTransaction(connection, sellingTransaction, [seller]);

    // Canceling
    const buyingTransaction = new Transaction();

    buyingTransaction.add(
      await createBuyInstruction(
        buyer.publicKey,
        buyerPaymentWallet,
        buyerItemWallet,
        sellerPaymentWallet,
        mint.publicKey
      )
    );

    await sendAndConfirmTransaction(connection, buyingTransaction, [buyer]);

    const [
      sellerItemWalletBalance,
      programItemWalletBalance,
      buyerItemWalletBalance,
      sellerPaymentWalletBalance,
      buyerPaymentWalletBalance,
    ] = await Promise.all([
      connection
        .getTokenAccountBalance(sellerItemWallet)
        .then((r) => r.value.amount),
      connection
        .getTokenAccountBalance(programItemWallet)
        .then((r) => r.value.amount),
      connection
        .getTokenAccountBalance(buyerItemWallet)
        .then((r) => r.value.amount),
      connection
        .getTokenAccountBalance(sellerPaymentWallet)
        .then((r) => r.value.amount),
      connection
        .getTokenAccountBalance(buyerPaymentWallet)
        .then((r) => r.value.amount),
    ]);

    const [itemMetadataAddr] = await findItemMetadataAddress(
      mint.publicKey
    ).then();

    const itemMetadata = await connection.getAccountInfo(itemMetadataAddr);

    expect(sellerItemWalletBalance).toEqual("0");
    expect(programItemWalletBalance).toEqual("0");
    expect(buyerItemWalletBalance).toEqual("1");

    expect(sellerPaymentWalletBalance).toEqual(1e9.toString());
    expect(buyerPaymentWalletBalance).toEqual("0");

    expect(itemMetadata).toBeNull();
  });
});
