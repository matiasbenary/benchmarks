import { exportToCSV, TransactionResult } from "./utils/output.js";
import { sleep } from "./utils/common.js";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { getFullnodeUrl, SuiClient } from "@mysten/sui/client";
import { MIST_PER_SUI } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";

const SUI_NETWORK = "testnet";
const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY || "";
const SUI_TO_ADDRESS =
  "0x3b5bcd532e83a91eeca8fa22cfdbfac5dfe1a07a575e4d9d5e2e3e6dc71dd47c";
const SUI_AMOUNT = "0.01";
const SUI_FINALITY_MODE: "WaitForLocalExecution" | "WaitForEffectsCert" = "WaitForLocalExecution";

const numTxs = 5;
const delayMs = 1000;

async function sendTransaction(
  client: SuiClient,
  keypair: Ed25519Keypair,
  address: string
): Promise<TransactionResult> {
  const balanceBefore = await client.getBalance({ owner: address });
  const balanceBeforeSUI = Number.parseInt(balanceBefore.totalBalance) / Number(MIST_PER_SUI);

  const amountInMist = Math.floor(parseFloat(SUI_AMOUNT) * 1_000_000_000);

  const tx = new Transaction();
  const [coin] = tx.splitCoins(tx.gas, [amountInMist]);
  tx.transferObjects([coin], SUI_TO_ADDRESS);
  const sendTime = Date.now();

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
  });

 //https://sdk.mystenlabs.com/typescript/transaction-building/basics#observing-the-results-of-a-transaction
  tx.setSenderIfNotSet(keypair.toSuiAddress());
  const transactionBytes = await tx.build({ client });

  const { signature, bytes } = await keypair.signTransaction(transactionBytes);
  await client.executeTransactionBlock({
    transactionBlock: bytes,
    signature,
    requestType: SUI_FINALITY_MODE,
  });

  const finalTime = Date.now();
  const latency = finalTime - sendTime;

  const balanceAfter = await client.getBalance({ owner: address });
  const balanceAfterSUI = Number.parseInt(balanceAfter.totalBalance) / Number(MIST_PER_SUI);
  const transactionFee = balanceBeforeSUI - balanceAfterSUI - parseFloat(SUI_AMOUNT);

  return {
    txId: result.digest,
    latency,
    fee: transactionFee,
  };
}

export async function runBenchmark(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SUI Protocol Finality Benchmark`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Network: ${SUI_NETWORK}`);
  console.log(`To Address: ${SUI_TO_ADDRESS}`);
  console.log(`Amount per tx: ${SUI_AMOUNT} SUI`);
  console.log(`${"=".repeat(60)}\n`);

  const results: TransactionResult[] = [];
  let errors = 0;
  const { secretKey } = decodeSuiPrivateKey(SUI_PRIVATE_KEY);
  const keypair = Ed25519Keypair.fromSecretKey(secretKey);
  const address = keypair.getPublicKey().toSuiAddress();
  console.log(`Account address: ${address}`);

  const suiClient = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });
  const balance = await suiClient.getBalance({
    owner: address,
  });
  console.log(
    `Account balance: ${
      Number.parseInt(balance.totalBalance) / Number(MIST_PER_SUI)
    } SUI \n`
  );

  for (let i = 0; i < numTxs; i++) {
    console.log(`Sending transaction ${i + 1}/${numTxs}...`);

    try {
      const result = await sendTransaction(suiClient, keypair, address);
      console.log(
        `Transaction ${i + 1}/${numTxs} - TxId: ${result.txId}, Latency: ${
          result.latency
        } ms`
      );
      results.push(result);
      console.log(`  ✓ Finalized in ${result.latency}ms (tx: ${result.txId})`);
    } catch (error) {
      console.log(error);
      
      errors++;
    }

    await sleep(delayMs);
  }

  console.log(`\n✓ SUI benchmark completed\n`);
  console.log(`Errors: ${errors} out of ${numTxs} transactions\n`);
  exportToCSV(results, `sui-${SUI_FINALITY_MODE === "WaitForEffectsCert" ? "final" : "optimistic"}`);
}

runBenchmark();
