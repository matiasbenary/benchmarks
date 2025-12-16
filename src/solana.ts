import { exportToCSV, TransactionResult } from "./utils/output.js";
import { sleep } from "./utils/common.js";
import {
  createKeyPairFromBytes,
  createSignerFromKeyPair,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getBase58Encoder,
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getSignatureFromTransaction,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  address,
  type KeyPairSigner,
} from "@solana/kit";

import { getTransferSolInstruction } from "@solana-program/system";

// https://api.mainnet-beta.solana.com
const SOL_RPC_URL = "https://api.devnet.solana.com";
const SOL_PRIVATE_KEY = process.env.SOL_PRIVATE_KEY || "";
const SOL_TO_ADDRESS = "CosSyFF2mqvCZZDNsXr19yQ8PHj8eVJ2qtMtauaFM7gA";
const SOL_AMOUNT = "0.001";
// https://solana.com/docs/rpc#configuring-state-commitment
const SOL_FINALITY_MODE: "confirmed" | "finalized" = "confirmed";
 
const numTxs = 5;
const delayMs = 1000;

// https://solana.com/es/developers/cookbook/transactions/send-sol
async function sendTransaction(
  sender: KeyPairSigner,
  rpc: ReturnType<typeof createSolanaRpc>,
  rpcSubscriptions: ReturnType<typeof createSolanaRpcSubscriptions>
): Promise<TransactionResult> {
  const { value: balanceBeforeLamports } = await rpc.getBalance(sender.address).send();
  const balanceBefore = Number(balanceBeforeLamports) / 1_000_000_000;

  const transferAmount = lamports(
    BigInt(parseFloat(SOL_AMOUNT) * 1_000_000_000)
  );

  const transferInstruction = getTransferSolInstruction({
    source: sender,
    destination: address(SOL_TO_ADDRESS),
    amount: transferAmount,
  });

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();

  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(sender, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions([transferInstruction], tx)
  );
  const sendTime = Date.now();
  const signedTransaction = await signTransactionMessageWithSigners(
    transactionMessage
  );

  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions } as any)(
    signedTransaction as any,
    { commitment: SOL_FINALITY_MODE }
  );

  const transactionSignature = getSignatureFromTransaction(signedTransaction);
  const finalTime = Date.now();
  const latency = finalTime - sendTime;

  const { value: balanceAfterLamports } = await rpc.getBalance(sender.address).send();
  const balanceAfter = Number(balanceAfterLamports) / 1_000_000_000;
  const transactionFee = balanceBefore - balanceAfter - parseFloat(SOL_AMOUNT);

  return {
    txId: transactionSignature,
    latency,
    fee: transactionFee,
  };
}

export async function runBenchmark(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Solana Protocol Finality Benchmark`);
  console.log(`${"=".repeat(60)}`);
  console.log(`RPC URL: ${SOL_RPC_URL}`);
  console.log(`To Address: ${SOL_TO_ADDRESS}`);
  console.log(`Amount per tx: ${SOL_AMOUNT} SOL`);
  console.log(`${"=".repeat(60)}\n`);
  const results: TransactionResult[] = [];
  let errors = 0;

  const keypair = await createKeyPairFromBytes(
    getBase58Encoder().encode(SOL_PRIVATE_KEY)
  );

  const signer = await createSignerFromKeyPair(keypair);
  console.log(`Account address: ${signer.address}`);

  const solanaRpc = createSolanaRpc(SOL_RPC_URL);
  const rpcUrl = SOL_RPC_URL.replace("https://", "wss://");
  const solanaRpcSubscriptions = createSolanaRpcSubscriptions(rpcUrl);

  const { value } = await solanaRpc.getBalance(signer.address).send();
  console.log(`Balance: ${Number(value) / 1_000_000_000} SOL\n`);

  for (let i = 0; i < numTxs; i++) {
    console.log(`Sending transaction ${i + 1}/${numTxs}...`);
    try {
      const result = await sendTransaction(
        signer,
        solanaRpc,
        solanaRpcSubscriptions
      );
      console.log(
        `Transaction ${i + 1}/${numTxs} - TxId: ${result.txId}, Latency: ${
          result.latency
        } ms`
      );
      results.push(result);
      console.log(`  ✓ Finalized in ${result.latency}ms (tx: ${result.txId})`);
    } catch (error) {
      errors++;
    }
    await sleep(delayMs);
  }
  console.log(`\n✓ SOLANA benchmark completed\n`);
  console.log(`Errors: ${errors} out of ${numTxs} transactions\n`);
  exportToCSV(results, `solana-${SOL_FINALITY_MODE === "finalized" ? "final" : "optimistic"}`);
}

runBenchmark();
