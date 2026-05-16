#!/usr/bin/env bash
# Run this after pushing to GitHub: bash .github/create-issues.sh
# Requires: gh CLI authenticated (gh auth login)
set -euo pipefail

REPO="${GITHUB_REPO:-your-org/sillage-bleu}"

create() {
  local title="$1" body="$2" labels="$3"
  gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels"
  echo "Created: $title"
}

# ── GOOD FIRST ISSUES ────────────────────────────────────────────

create \
  "[DOCS] Add JSDoc comments to all SDK public methods" \
  "The \`@sillage-bleu/sdk\` TypeScript client (\`sdk/src/\`) has no JSDoc on its public methods. Add parameter descriptions and return type docs to \`VesselClient\`, \`CatchClient\`, \`TelemetryClient\`, and \`CreditsClient\`.\n\n**Files:** \`sdk/src/vessel.ts\`, \`sdk/src/catch.ts\`, \`sdk/src/telemetry.ts\`, \`sdk/src/credits.ts\`\n\n**Estimated effort:** 2–3h\n\n**Mentorship available:** Yes — comment here and a maintainer will guide you." \
  "good-first-issue,docs,sdk"

create \
  "[DOCS] Write SMS/USSD guide in French (West Africa localisation)" \
  "The \`docs/sms-guide.md\` is English-only. Our primary users in Senegal and Côte d'Ivoire are French speakers. Translate the guide to French.\n\n**File:** \`docs/sms-guide.md\` → create \`docs/sms-guide-fr.md\`\n\n**Estimated effort:** 2h\n\n**Mentorship available:** Yes." \
  "good-first-issue,docs"

create \
  "[FE] Add loading skeleton to Fisher Dashboard catch history" \
  "The catch history list in \`frontend/web/src/app/fisher/page.tsx\` shows a plain 'Loading…' text while fetching. Replace with a CSS skeleton loader for better UX on slow connections.\n\n**File:** \`frontend/web/src/app/fisher/page.tsx\`\n\n**Estimated effort:** 2–3h" \
  "good-first-issue,frontend"

create \
  "[BE] Add \`/api/vessels\` GET endpoint to list all active vessels" \
  "The API has vessel registration via contracts but no REST endpoint to list vessels from the database. Add \`GET /api/vessels\` with optional \`?status=active\` filter.\n\n**Files:** \`backend/api-gateway/src/routes/\` (create \`vessels.ts\`), register in \`src/index.ts\`\n\n**Estimated effort:** 2–3h" \
  "good-first-issue,backend"

create \
  "[INFRA] Add \`.env.test\` example for CI environment" \
  "The CI pipeline uses hardcoded env vars in \`ci.yml\`. Add a \`.env.test.example\` file documenting all variables needed to run tests locally, and reference it in the developer onboarding guide.\n\n**Files:** \`.env.test.example\`, \`docs/developer-onboarding.md\`\n\n**Estimated effort:** 1h" \
  "good-first-issue,infra,docs"

# ── ENHANCEMENTS ─────────────────────────────────────────────────

create \
  "[SC] Add \`get_fisher_vessels\` pagination to VesselRegistry contract" \
  "The \`get_fisher_vessels\` function in \`contracts/vessel-registry/src/lib.rs\` returns all vessel IDs for a fisher with no pagination. For fishers with many vessels this could hit Soroban storage limits. Add \`offset\` and \`limit\` parameters.\n\n**Acceptance criteria:**\n- [ ] Function accepts \`offset: u32\` and \`limit: u32\`\n- [ ] Returns a slice of the vessel ID vec\n- [ ] Test with 10+ vessels" \
  "enhancement,contracts"

create \
  "[BE] Implement ESG Merkle root computation in the backend" \
  "The \`POST /api/esg/snapshots\` endpoint accepts a \`merkleRoot\` from the caller but does not compute it. Implement server-side Merkle root computation over all approved catch IDs + weights for the period, so the caller only needs to provide the period range.\n\n**File:** \`backend/api-gateway/src/routes/esg.ts\`, new \`src/services/merkleService.ts\`\n\n**Acceptance criteria:**\n- [ ] Deterministic Merkle root computed from sorted catch records\n- [ ] Unit test verifying root matches expected value for known input" \
  "enhancement,backend"

create \
  "[FE] Add offline catch queue with IndexedDB sync for Fisher Dashboard" \
  "Fishers in coastal areas lose connectivity. The Fisher Dashboard should queue catch submissions in IndexedDB when offline and sync them when connectivity returns.\n\n**File:** \`frontend/web/src/app/fisher/page.tsx\`, new \`src/lib/offlineQueue.ts\`\n\n**Acceptance criteria:**\n- [ ] Catches submitted offline are stored in IndexedDB\n- [ ] On reconnect, queued catches are submitted automatically\n- [ ] UI shows 'Queued (offline)' badge on pending items" \
  "enhancement,frontend"

create \
  "[SC] Add batch catch submission to CatchVerification contract" \
  "Currently \`submit_catch\` only accepts one catch at a time. For vessels that collect data offline and sync later, a \`batch_submit\` function accepting a \`Vec<CatchEvent>\` would reduce transaction count significantly.\n\n**File:** \`contracts/catch-verification/src/lib.rs\`\n\n**Acceptance criteria:**\n- [ ] \`batch_submit\` accepts up to 10 catches\n- [ ] Each catch goes through the same fraud guard\n- [ ] Events emitted for each catch\n- [ ] Test with 5-catch batch" \
  "enhancement,contracts"

create \
  "[BE] Add vessel compliance score history endpoint" \
  "The \`vessels\` table has a single \`compliance_score\` column but no history. Add a \`vessel_compliance_history\` table and a \`GET /api/vessels/:id/compliance-history\` endpoint so regulators can see score changes over time.\n\n**Acceptance criteria:**\n- [ ] Migration adds \`vessel_compliance_history\` table\n- [ ] Score changes are logged on every update\n- [ ] Endpoint returns paginated history with timestamps and reasons" \
  "enhancement,backend"

create \
  "[FE] Add QR code generation for catch provenance on Buyer Portal" \
  "The Buyer Portal (\`frontend/web/src/app/buyer/page.tsx\`) shows catch details but has no way to share them. Add a QR code that encodes the catch ID URL so buyers can print it on packaging.\n\n**Acceptance criteria:**\n- [ ] QR code generated client-side (use \`qrcode\` npm package)\n- [ ] Encodes \`https://app.sillagebleu.io/buyer?catchId=<id>\`\n- [ ] Downloadable as PNG" \
  "enhancement,frontend"

create \
  "[SDK] Add \`EsgClient\` to the SDK for ESG snapshot queries" \
  "The \`@sillage-bleu/sdk\` is missing an ESG client. Add \`EsgClient\` with methods: \`getSummary()\`, \`getSnapshots(limit)\`, \`getVesselReport(vesselId)\`.\n\n**File:** \`sdk/src/esg.ts\`, export from \`sdk/src/index.ts\`\n\n**Acceptance criteria:**\n- [ ] All three methods implemented with Zod-validated responses\n- [ ] Unit tests for each method\n- [ ] Exported from package index" \
  "enhancement,sdk"

# ── BUGS ─────────────────────────────────────────────────────────

create \
  "[BUG] SMS session not cleaned up after 'done' state — stale sessions accumulate" \
  "In \`backend/api-gateway/src/services/smsService.ts\`, the \`handleIncoming\` query selects sessions \`WHERE state != 'done'\` but completed sessions are never deleted or expired. Over time this table will grow unbounded.\n\n**Fix:** Add a TTL-based cleanup job (e.g. delete sessions older than 7 days) or add a \`expires_at\` column and filter on it.\n\n**File:** \`src/services/smsService.ts\`, \`src/db/migrations/\`" \
  "bug,backend"

create \
  "[BUG] \`TelemetryClient.flush()\` does not handle partial batch failures" \
  "In \`sdk/src/telemetry.ts\`, if the \`/api/telemetry/batch\` request fails, the entire buffer is lost (it was already spliced out before the request). Failed pings should be re-queued.\n\n**Fix:** Only clear the buffer after a successful response; on failure, prepend the batch back to the buffer.\n\n**File:** \`sdk/src/telemetry.ts\`" \
  "bug,sdk"

create \
  "[BUG] Fisher Dashboard shows stale credit balance after new catch approval" \
  "In \`frontend/web/src/app/fisher/page.tsx\`, the credits query (\`queryKey: ['credits', address]\`) is not invalidated when a catch status changes to 'approved'. The balance only updates on page refresh.\n\n**Fix:** Invalidate \`['credits', address]\` query when the catch list refetches and contains newly approved catches.\n\n**File:** \`frontend/web/src/app/fisher/page.tsx\`" \
  "bug,frontend"

echo ""
echo "✅ All 15 issues created on $REPO"
