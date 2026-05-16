#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, panic_with_error, symbol_short,
    Address, Bytes, Env,
};
use shared::{EsgSnapshot, Role};

#[contracttype]
pub enum DataKey {
    Snapshot(u64),       // period_start → snapshot
    SnapshotIndex,       // Vec<u64> of all period starts
    CumulativeKg,
    CumulativeCredits,
    Role(Address),
    Admin,
}

#[contracterror]
#[derive(Clone)]
pub enum Error {
    Unauthorized = 1,
    SnapshotExists = 2,
    SnapshotNotFound = 3,
}

#[contract]
pub struct EsgIndexContract;

#[contractimpl]
impl EsgIndexContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CumulativeKg, &0u64);
        env.storage().instance().set(&DataKey::CumulativeCredits, &0u64);
    }

    pub fn set_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        Self::require_admin(&env, &caller);
        env.storage().persistent().set(&DataKey::Role(target), &role);
    }

    /// Publish a new ESG snapshot (ESG auditor or admin)
    pub fn publish_snapshot(
        env: Env,
        caller: Address,
        period_start: u64,
        period_end: u64,
        total_verified_kg: u64,
        total_credits_issued: u64,
        active_vessels: u32,
        avg_sustainability_score: u32,
        merkle_root: Bytes,
    ) -> EsgSnapshot {
        caller.require_auth();
        Self::require_role(&env, &caller, Role::EsgAuditor);

        if env.storage().persistent().has(&DataKey::Snapshot(period_start)) {
            panic_with_error!(&env, Error::SnapshotExists);
        }

        let snapshot = EsgSnapshot {
            period_start,
            period_end,
            total_verified_kg,
            total_credits_issued,
            active_vessels,
            avg_sustainability_score,
            merkle_root,
        };

        env.storage().persistent().set(&DataKey::Snapshot(period_start), &snapshot);

        // Update index
        let mut index: soroban_sdk::Vec<u64> = env
            .storage().instance()
            .get(&DataKey::SnapshotIndex)
            .unwrap_or(soroban_sdk::Vec::new(&env));
        index.push_back(period_start);
        env.storage().instance().set(&DataKey::SnapshotIndex, &index);

        // Update cumulative totals
        let cum_kg: u64 = env.storage().instance().get(&DataKey::CumulativeKg).unwrap_or(0);
        let cum_cr: u64 = env.storage().instance().get(&DataKey::CumulativeCredits).unwrap_or(0);
        env.storage().instance().set(&DataKey::CumulativeKg, &(cum_kg + total_verified_kg));
        env.storage().instance().set(&DataKey::CumulativeCredits, &(cum_cr + total_credits_issued));

        env.events().publish(
            (symbol_short!("esg"), symbol_short!("snapshot")),
            (period_start, total_credits_issued, avg_sustainability_score),
        );

        snapshot
    }

    pub fn get_snapshot(env: Env, period_start: u64) -> EsgSnapshot {
        env.storage().persistent()
            .get(&DataKey::Snapshot(period_start))
            .unwrap_or_else(|| panic_with_error!(&env, Error::SnapshotNotFound))
    }

    pub fn get_snapshot_index(env: Env) -> soroban_sdk::Vec<u64> {
        env.storage().instance()
            .get(&DataKey::SnapshotIndex)
            .unwrap_or(soroban_sdk::Vec::new(&env))
    }

    pub fn get_cumulative_stats(env: Env) -> (u64, u64) {
        let kg: u64 = env.storage().instance().get(&DataKey::CumulativeKg).unwrap_or(0);
        let cr: u64 = env.storage().instance().get(&DataKey::CumulativeCredits).unwrap_or(0);
        (kg, cr)
    }

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if *caller != admin {
            panic_with_error!(env, Error::Unauthorized);
        }
    }

    fn require_role(env: &Env, caller: &Address, required: Role) {
        let role: Role = env.storage().persistent()
            .get(&DataKey::Role(caller.clone()))
            .unwrap_or_else(|| panic_with_error!(env, Error::Unauthorized));
        if role != required && role != Role::Admin {
            panic_with_error!(env, Error::Unauthorized);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_publish_and_retrieve_snapshot() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, EsgIndexContract);
        let admin = Address::generate(&env);
        let auditor = Address::generate(&env);

        let client = EsgIndexContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_role(&admin, &auditor, &Role::EsgAuditor);

        let snap = client.publish_snapshot(
            &auditor,
            &1_000_000u64, &1_086_400u64,
            &50_000u64, &500_000_000u64,
            &12u32, &78u32,
            &Bytes::from_slice(&env, b"merkle_root_hash"),
        );

        assert_eq!(snap.active_vessels, 12);
        assert_eq!(snap.avg_sustainability_score, 78);

        let (cum_kg, cum_cr) = client.get_cumulative_stats();
        assert_eq!(cum_kg, 50_000);
        assert_eq!(cum_cr, 500_000_000);
    }

    #[test]
    #[should_panic]
    fn test_duplicate_snapshot_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, EsgIndexContract);
        let admin = Address::generate(&env);
        let auditor = Address::generate(&env);

        let client = EsgIndexContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_role(&admin, &auditor, &Role::EsgAuditor);

        let root = Bytes::from_slice(&env, b"root");
        client.publish_snapshot(&auditor, &1000u64, &2000u64, &100u64, &1000u64, &5u32, &80u32, &root);
        client.publish_snapshot(&auditor, &1000u64, &2000u64, &100u64, &1000u64, &5u32, &80u32, &root);
    }
}
