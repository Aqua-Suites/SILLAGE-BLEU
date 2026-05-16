#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, panic_with_error, symbol_short,
    Address, Bytes, Env, String,
};
use shared::{CatchEvent, Role, VerificationStatus};

#[contracttype]
pub enum DataKey {
    Catch(Bytes),
    VesselCatches(Bytes),   // vessel_id → Vec<catch_id>
    FisherCatches(Address), // fisher → Vec<catch_id>
    Role(Address),
    Admin,
    VesselRegistry,
    // Fraud: track (vessel_id, timestamp_bucket) to detect duplicates
    DuplicateGuard(Bytes, u64),
}

#[contracterror]
#[derive(Clone)]
pub enum Error {
    Unauthorized = 1,
    CatchExists = 2,
    CatchNotFound = 3,
    DuplicateCatch = 4,
    InvalidWeight = 5,
    SuspiciousGps = 6,
}

/// Max weight per single catch event (10 000 kg)
const MAX_CATCH_KG: u64 = 10_000;
/// Duplicate window: 1 hour in seconds
const DUPLICATE_WINDOW_SECS: u64 = 3_600;

#[contract]
pub struct CatchVerificationContract;

#[contractimpl]
impl CatchVerificationContract {
    pub fn initialize(env: Env, admin: Address, vessel_registry: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VesselRegistry, &vessel_registry);
    }

    pub fn set_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        Self::require_admin(&env, &caller);
        env.storage().persistent().set(&DataKey::Role(target), &role);
    }

    /// Submit a catch event (fisher or vessel owner)
    pub fn submit_catch(
        env: Env,
        fisher: Address,
        catch_id: Bytes,
        vessel_id: Bytes,
        species: String,
        weight_kg: u64,
        latitude: i64,
        longitude: i64,
        ipfs_evidence: String,
    ) -> CatchEvent {
        fisher.require_auth();
        Self::require_fisher_or_owner(&env, &fisher);

        // Validate weight
        if weight_kg == 0 || weight_kg > MAX_CATCH_KG {
            panic_with_error!(&env, Error::InvalidWeight);
        }

        // Validate GPS bounds
        if latitude.abs() > 90_000_000 || longitude.abs() > 180_000_000 {
            panic_with_error!(&env, Error::SuspiciousGps);
        }

        // Duplicate guard: same vessel within 1-hour bucket
        let ts = env.ledger().timestamp();
        let bucket = ts / DUPLICATE_WINDOW_SECS;
        let dup_key = DataKey::DuplicateGuard(vessel_id.clone(), bucket);
        if env.storage().temporary().has(&dup_key) {
            panic_with_error!(&env, Error::DuplicateCatch);
        }
        env.storage().temporary().set(&dup_key, &true);

        if env.storage().persistent().has(&DataKey::Catch(catch_id.clone())) {
            panic_with_error!(&env, Error::CatchExists);
        }

        let event = CatchEvent {
            catch_id: catch_id.clone(),
            vessel_id: vessel_id.clone(),
            fisher: fisher.clone(),
            species,
            weight_kg,
            latitude,
            longitude,
            timestamp: ts,
            status: VerificationStatus::Pending,
            ipfs_evidence,
        };

        env.storage().persistent().set(&DataKey::Catch(catch_id.clone()), &event);

        // Index by vessel
        let mut vc: soroban_sdk::Vec<Bytes> = env
            .storage().persistent()
            .get(&DataKey::VesselCatches(vessel_id.clone()))
            .unwrap_or(soroban_sdk::Vec::new(&env));
        vc.push_back(catch_id.clone());
        env.storage().persistent().set(&DataKey::VesselCatches(vessel_id), &vc);

        // Index by fisher
        let mut fc: soroban_sdk::Vec<Bytes> = env
            .storage().persistent()
            .get(&DataKey::FisherCatches(fisher.clone()))
            .unwrap_or(soroban_sdk::Vec::new(&env));
        fc.push_back(catch_id.clone());
        env.storage().persistent().set(&DataKey::FisherCatches(fisher), &fc);

        env.events().publish(
            (symbol_short!("catch"), symbol_short!("submit")),
            catch_id,
        );

        event
    }

    /// Verifier approves or rejects a catch
    pub fn verify_catch(
        env: Env,
        verifier: Address,
        catch_id: Bytes,
        approved: bool,
        reason: String,
    ) -> CatchEvent {
        verifier.require_auth();
        Self::require_role(&env, &verifier, Role::Verifier);

        let mut event: CatchEvent = env
            .storage().persistent()
            .get(&DataKey::Catch(catch_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::CatchNotFound));

        event.status = if approved {
            VerificationStatus::Approved
        } else {
            VerificationStatus::Rejected
        };

        env.storage().persistent().set(&DataKey::Catch(catch_id.clone()), &event);

        let status_sym = if approved {
            symbol_short!("approved")
        } else {
            symbol_short!("rejected")
        };
        env.events().publish(
            (symbol_short!("catch"), status_sym),
            (catch_id, reason),
        );

        event
    }

    /// Flag a catch as suspicious (verifier or admin)
    pub fn flag_catch(env: Env, caller: Address, catch_id: Bytes, reason: String) {
        caller.require_auth();
        let role: Role = env.storage().persistent()
            .get(&DataKey::Role(caller.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::Unauthorized));
        if role != Role::Verifier && role != Role::Admin {
            panic_with_error!(&env, Error::Unauthorized);
        }

        let mut event: CatchEvent = env
            .storage().persistent()
            .get(&DataKey::Catch(catch_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::CatchNotFound));

        event.status = VerificationStatus::Flagged;
        env.storage().persistent().set(&DataKey::Catch(catch_id.clone()), &event);

        env.events().publish(
            (symbol_short!("catch"), symbol_short!("flagged")),
            (catch_id, reason),
        );
    }

    pub fn get_catch(env: Env, catch_id: Bytes) -> CatchEvent {
        env.storage().persistent()
            .get(&DataKey::Catch(catch_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::CatchNotFound))
    }

    pub fn get_vessel_catches(env: Env, vessel_id: Bytes) -> soroban_sdk::Vec<Bytes> {
        env.storage().persistent()
            .get(&DataKey::VesselCatches(vessel_id))
            .unwrap_or(soroban_sdk::Vec::new(&env))
    }

    // --- Internal ---

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

    fn require_fisher_or_owner(env: &Env, caller: &Address) {
        let role: Role = env.storage().persistent()
            .get(&DataKey::Role(caller.clone()))
            .unwrap_or_else(|| panic_with_error!(env, Error::Unauthorized));
        if role != Role::Fisher && role != Role::VesselOwner && role != Role::Admin {
            panic_with_error!(env, Error::Unauthorized);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn make_catch_id(env: &Env, s: &[u8]) -> Bytes {
        Bytes::from_slice(env, s)
    }

    #[test]
    fn test_submit_and_verify() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CatchVerificationContract);
        let admin = Address::generate(&env);
        let fisher = Address::generate(&env);
        let verifier = Address::generate(&env);
        let registry = Address::generate(&env);

        let client = CatchVerificationContractClient::new(&env, &contract_id);
        client.initialize(&admin, &registry);
        client.set_role(&admin, &fisher, &Role::Fisher);
        client.set_role(&admin, &verifier, &Role::Verifier);

        let catch_id = make_catch_id(&env, b"CATCH001");
        let vessel_id = make_catch_id(&env, b"VESSEL001");

        let event = client.submit_catch(
            &fisher, &catch_id, &vessel_id,
            &String::from_str(&env, "Yellowfin Tuna"),
            &500u64, &14_692_000i64, &-17_447_000i64,
            &String::from_str(&env, "QmXyz..."),
        );
        assert_eq!(event.status, VerificationStatus::Pending);

        let verified = client.verify_catch(
            &verifier, &catch_id, &true,
            &String::from_str(&env, "GPS and weight validated"),
        );
        assert_eq!(verified.status, VerificationStatus::Approved);
    }

    #[test]
    #[should_panic]
    fn test_duplicate_catch_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CatchVerificationContract);
        let admin = Address::generate(&env);
        let fisher = Address::generate(&env);
        let registry = Address::generate(&env);

        let client = CatchVerificationContractClient::new(&env, &contract_id);
        client.initialize(&admin, &registry);
        client.set_role(&admin, &fisher, &Role::Fisher);

        let vessel_id = Bytes::from_slice(&env, b"VESSEL001");

        client.submit_catch(
            &fisher, &Bytes::from_slice(&env, b"C001"), &vessel_id,
            &String::from_str(&env, "Sardine"), &100u64,
            &14_000_000i64, &-17_000_000i64,
            &String::from_str(&env, "QmA"),
        );
        // Same vessel, same time bucket → duplicate
        client.submit_catch(
            &fisher, &Bytes::from_slice(&env, b"C002"), &vessel_id,
            &String::from_str(&env, "Sardine"), &100u64,
            &14_000_000i64, &-17_000_000i64,
            &String::from_str(&env, "QmB"),
        );
    }

    #[test]
    #[should_panic]
    fn test_invalid_weight_rejected() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, CatchVerificationContract);
        let admin = Address::generate(&env);
        let fisher = Address::generate(&env);
        let registry = Address::generate(&env);

        let client = CatchVerificationContractClient::new(&env, &contract_id);
        client.initialize(&admin, &registry);
        client.set_role(&admin, &fisher, &Role::Fisher);

        client.submit_catch(
            &fisher, &Bytes::from_slice(&env, b"C003"),
            &Bytes::from_slice(&env, b"V001"),
            &String::from_str(&env, "Tuna"), &99_999u64,
            &0i64, &0i64, &String::from_str(&env, "Qm"),
        );
    }
}
