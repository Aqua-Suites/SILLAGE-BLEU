import {
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from '@stellar/stellar-sdk';
import type { CatchValidationJob } from '../workers/catchWorker';

const server = new SorobanRpc.Server(
  process.env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
);
const networkPassphrase =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? Networks.TESTNET;

const signerKeypair = Keypair.fromSecret(
  process.env.STELLAR_SIGNER_SECRET ?? '',
);

async function invokeContract(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
): Promise<string> {
  const account = await server.getAccount(signerKeypair.publicKey());
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(signerKeypair);

  const result = await server.sendTransaction(prepared);
  if (result.status === 'ERROR') throw new Error(`Contract call failed: ${result.errorResult}`);

  // Poll for confirmation
  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise((r) => setTimeout(r, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  return result.hash;
}

export const StellarService = {
  async submitCatch(data: CatchValidationJob): Promise<string> {
    const contractId = process.env.CONTRACT_CATCH_VERIFICATION ?? '';
    return invokeContract(contractId, 'submit_catch', [
      nativeToScVal(data.fisherAddress, { type: 'address' }),
      nativeToScVal(Buffer.from(data.catchId), { type: 'bytes' }),
      nativeToScVal(Buffer.from(data.vesselId), { type: 'bytes' }),
      nativeToScVal(data.species, { type: 'string' }),
      nativeToScVal(BigInt(Math.round(data.weightKg)), { type: 'u64' }),
      nativeToScVal(BigInt(Math.round(data.latitude * 1e6)), { type: 'i64' }),
      nativeToScVal(BigInt(Math.round(data.longitude * 1e6)), { type: 'i64' }),
      nativeToScVal(data.ipfsEvidence, { type: 'string' }),
    ]);
  },

  async mintCredit(params: {
    creditId: string;
    vesselId: string;
    fisherAddress: string;
    catchId: string;
    weightKg: number;
    complianceScore: number;
  }): Promise<string> {
    const contractId = process.env.CONTRACT_BLUE_CREDIT_MINTING ?? '';
    return invokeContract(contractId, 'mint_credit', [
      nativeToScVal(signerKeypair.publicKey(), { type: 'address' }),
      nativeToScVal(Buffer.from(params.creditId), { type: 'bytes' }),
      nativeToScVal(Buffer.from(params.vesselId), { type: 'bytes' }),
      nativeToScVal(params.fisherAddress, { type: 'address' }),
      nativeToScVal(Buffer.from(params.catchId), { type: 'bytes' }),
      nativeToScVal(BigInt(Math.round(params.weightKg)), { type: 'u64' }),
      nativeToScVal(params.complianceScore, { type: 'u32' }),
    ]);
  },
};
