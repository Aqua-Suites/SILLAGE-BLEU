#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${CONTRACTS_DIR}/.." && pwd)"

NETWORK="${STELLAR_NETWORK:-testnet}"
RPC_URL="${STELLAR_RPC_URL:-https://soroban-testnet.stellar.org}"
PASSPHRASE="${STELLAR_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
DEPLOYER_KEY="${DEPLOYER_SECRET_KEY:?DEPLOYER_SECRET_KEY required}"

# Build only if WASM artifacts are not already present (CI reuses artifacts from contracts job)
WASM_DIR="${CONTRACTS_DIR}/target/wasm32v1-none/release"
if [ ! -d "${WASM_DIR}" ]; then
  echo "==> Building contracts..."
  cargo build --manifest-path "${CONTRACTS_DIR}/Cargo.toml" --target wasm32v1-none --release
fi

deploy_contract() {
  local name=$1
  local wasm="${WASM_DIR}/${name//-/_}.wasm"
  echo "==> Deploying ${name}..."
  stellar contract deploy \
    --wasm "$wasm" \
    --source "$DEPLOYER_KEY" \
    --network "$NETWORK" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE"
}

VESSEL_REGISTRY=$(deploy_contract "vessel-registry")
CATCH_VERIFICATION=$(deploy_contract "catch-verification")
BLUE_CREDIT_MINTING=$(deploy_contract "blue-credit-minting")
SETTLEMENT=$(deploy_contract "settlement")
ESG_INDEX=$(deploy_contract "esg-index")

echo ""
echo "==> Contract addresses:"
echo "CONTRACT_VESSEL_REGISTRY=${VESSEL_REGISTRY}"
echo "CONTRACT_CATCH_VERIFICATION=${CATCH_VERIFICATION}"
echo "CONTRACT_BLUE_CREDIT_MINTING=${BLUE_CREDIT_MINTING}"
echo "CONTRACT_SETTLEMENT=${SETTLEMENT}"
echo "CONTRACT_ESG_INDEX=${ESG_INDEX}"

cat > "${REPO_ROOT}/.env.contracts" <<EOF
CONTRACT_VESSEL_REGISTRY=${VESSEL_REGISTRY}
CONTRACT_CATCH_VERIFICATION=${CATCH_VERIFICATION}
CONTRACT_BLUE_CREDIT_MINTING=${BLUE_CREDIT_MINTING}
CONTRACT_SETTLEMENT=${SETTLEMENT}
CONTRACT_ESG_INDEX=${ESG_INDEX}
EOF

echo "==> Saved to .env.contracts"
