import { Account, JsonRpcProvider, actionCreators } from 'near-api-js';
import { NEAR } from 'near-api-js/tokens';

import { exportToCSV, TransactionResult } from './utils/output.js';
import { sleep } from './utils/common.js';

// Configuration
const NEAR_NETWORK_ID = "testnet"
const NEAR_ACCOUNT_ID = 'maguila.testnet'
const NEAR_PRIVATE_KEY = ''
const NEAR_RECEIVER_ID = 'alakazam.testnet'
const NEAR_AMOUNT = '0.01'


const nodeUrl = `https://rpc.${NEAR_NETWORK_ID}.fastnear.com`;
const numTxs = 30;
const delayMs = 1000;


async function sendTransaction(
    account: Account,
    receiverId: string,
    amount: string
): Promise<TransactionResult> {

    const signedTx = await account.createSignedTransaction({
        receiverId,
        actions: [
            actionCreators.transfer(BigInt(NEAR.toUnits(amount)))
        ]
    });

    const provider = account.provider as JsonRpcProvider;
    const sendTime = Date.now();

    const result = await provider.sendTransactionUntil(
        signedTx,
        'FINAL'
    );

    const finalTime = Date.now();
    const latency = finalTime - sendTime;

    return {
        txId: result.transaction.hash,
        latency,
    };
}

/**
 * Run NEAR finality benchmark
 */
export async function runBenchmark(): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`NEAR Protocol Finality Benchmark`);
    console.log(`${'='.repeat(60)}`);
    console.log(`RPC URL: ${nodeUrl}`);
    console.log(`Account: ${NEAR_ACCOUNT_ID}`);
    console.log(`Receiver: ${NEAR_RECEIVER_ID}`);
    console.log(`Amount per tx: ${NEAR_AMOUNT} NEAR`);
    console.log(`${'='.repeat(60)}\n`);


    // Initialize NEAR connection
    console.log('Initializing NEAR connection...');
    const provider = new JsonRpcProvider({ url: nodeUrl });
    const account = new Account(NEAR_ACCOUNT_ID, provider, NEAR_PRIVATE_KEY);

    // Check account balance
    const balance = await account.getBalance();
    const balanceNear = NEAR.toDecimal(balance);
    console.log(`Account balance: ${balanceNear} NEAR`);

    // Calculate total cost estimate
    const totalAmount = parseFloat(NEAR_AMOUNT) * numTxs;
    const estimatedGas = 0.0003 * numTxs;
    const totalCost = totalAmount + estimatedGas;
    console.log(`Estimated total cost: ~${totalCost.toFixed(4)} NEAR\n`);

    if (parseFloat(balanceNear) < totalCost) {
        throw new Error(`Insufficient balance. Need ~${totalCost.toFixed(4)} NEAR, have ${balanceNear} NEAR`);
    }

    const results: TransactionResult[] = [];
    let errors = 0;

    for (let i = 0; i < numTxs; i++) {
        console.log(`Sending transaction ${i + 1}/${numTxs}...`);

        try {
            const result = await sendTransaction(account, NEAR_RECEIVER_ID, NEAR_AMOUNT);
            results.push(result);
            console.log(`  ✓ Finalized in ${result.latency}ms (tx: ${result.txId})`);
        } catch (error) {
            console.error(`  ✗ Error sending transaction: ${(error as Error).message}`);   
            errors++;
        }

        await sleep(delayMs);
    }

    console.log(`\n✓ NEAR benchmark completed\n`);
    console.log(`Errors: ${errors} out of ${numTxs} transactions\n`);
    exportToCSV(results, "near");
}

runBenchmark();