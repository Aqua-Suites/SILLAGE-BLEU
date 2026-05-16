#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, log, panic_with_error, symbol_short,
    Address, Bytes, Env, String,
};
use shared::{Role, Vessel, VesselStatus};

#[contracttype]
pub enum DataKey {
    Vessel(Bytes),
    FisherVessels(Address),
    Role(Address),
    Admin,
}

#[contracttype]
#[derive(Clone)]
pub enum Error {
    Unauthorized = 1,
    VesselExists = 2,
    VesselNotFound = 3,
    InvalidInput = 4,
}

impl soroban_sdk::contracterror::ContractError for Error {
    fn as_u32(&self) -> u32 {
        self.clone() as u32
    }
}

#[contract]
pub struct VesselRegistryContract;

#[contractimpl]
impl VesselRegistryContract {
    /// Initialize with admin address
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Assign a role to an address (admin only)
    pub fn set_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        Self::require_admin(&env, &caller);
        env.storage().persistent().set(&DataKey::Role(target), &role);
    }

    /// Register a new vessel
    pub fn register_vessel(
        env: Env,
        owner: Address,
        fisher: Address,
        vessel_id: Bytes,
        name: String,
        flag_state: String,
        imo_number: String,
    ) -> Vessel {
        owner.require_auth();
        Self::require_role(&env, &owner, Role::VesselOwner);

        if env.storage().persistent().has(&DataKey::Vessel(vessel_id.clone())) {
            panic_with_error!(&env, Error::VesselExists);
        }

        let vessel = Vessel {
            vessel_id: vessel_id.clone(),
            owner: owner.clone(),
            fisher: fisher.clone(),
            name,
            flag_state,
            imo_number,
            registered_at: env.ledger().timestamp(),
            status: VesselStatus::Active,
            compliance_score: 100,
        };

        env.storage().persistent().set(&DataKey::Vessel(vessel_id.clone()), &vessel);

        // Track vessels per fisher
        let mut vessels: soroban_sdk::Vec<Bytes> = env
            .storage()
            .persistent()
            .get(&DataKey::FisherVessels(fisher.clone()))
            .unwrap_or(soroban_sdk::Vec::new(&env));
        vessels.push_back(vessel_id.clone());
        env.storage().persistent().set(&DataKey::FisherVessels(fisher), &vessels);

        env.events().publish(
            (symbol_short!("vessel"), symbol_short!("reg")),
            vessel_id,
        );

        vessel
    }

    /// Update vessel compliance score (verifier only)
    pub fn update_compliance(
        env: Env,
        verifier: Address,
        vessel_id: Bytes,
        score: u32,
    ) {
        verifier.require_auth();
        Self::require_role(&env, &verifier, Role::Verifier);

        let mut vessel: Vessel = env
            .storage()
            .persistent()
            .get(&DataKey::Vessel(vessel_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VesselNotFound));

        vessel.compliance_score = score.min(100);
        if score < 20 {
            vessel.status = VesselStatus::Suspended;
        }

        env.storage().persistent().set(&DataKey::Vessel(vessel_id.clone()), &vessel);
        env.events().publish(
            (symbol_short!("vessel"), symbol_short!("score")),
            (vessel_id, score),
        );
    }

    /// Suspend a vessel (admin or verifier)
    pub fn suspend_vessel(env: Env, caller: Address, vessel_id: Bytes) {
        caller.require_auth();
        let role: Role = env
            .storage()
            .persistent()
            .get(&DataKey::Role(caller.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::Unauthorized));
        if role != Role::Admin && role != Role::Verifier {
            panic_with_error!(&env, Error::Unauthorized);
        }

        let mut vessel: Vessel = env
            .storage()
            .persistent()
            .get(&DataKey::Vessel(vessel_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VesselNotFound));

        vessel.status = VesselStatus::Suspended;
        env.storage().persistent().set(&DataKey::Vessel(vessel_id.clone()), &vessel);
        env.events().publish(
            (symbol_short!("vessel"), symbol_short!("suspend")),
            vessel_id,
        );
    }

    /// Get vessel by ID
    pub fn get_vessel(env: Env, vessel_id: Bytes) -> Vessel {
        env.storage()
            .persistent()
            .get(&DataKey::Vessel(vessel_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::VesselNotFound))
    }

    /// Get all vessel IDs for a fisher
    pub fn get_fisher_vessels(env: Env, fisher: Address) -> soroban_sdk::Vec<Bytes> {
        env.storage()
            .persistent()
            .get(&DataKey::FisherVessels(fisher))
            .unwrap_or(soroban_sdk::Vec::new(&env))
    }

    // --- Internal helpers ---

    fn require_admin(env: &Env, caller: &Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if *caller != admin {
            panic_with_error!(env, Error::Unauthorized);
        }
    }

    fn require_role(env: &Env, caller: &Address, required: Role) {
        let role: Role = env
            .storage()
            .persistent()
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

    fn setup() -> (Env, Address, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, VesselRegistryContract);
        let admin = Address::generate(&env);
        let owner = Address::generate(&env);
        let fisher = Address::generate(&env);

        let client = VesselRegistryContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_role(&admin, &owner, &Role::VesselOwner);
        client.set_role(&admin, &fisher, &Role::Fisher);

        (env, contract_id, owner, fisher)
    }

    #[test]
    fn test_register_and_get_vessel() {
        let (env, contract_id, owner, fisher) = setup();
        let client = VesselRegistryContractClient::new(&env, &contract_id);

        let vessel_id = Bytes::from_slice(&env, b"VESSEL001");
        let vessel = client.register_vessel(
            &owner,
            &fisher,
            &vessel_id,
            &String::from_str(&env, "Blue Horizon"),
            &String::from_str(&env, "SN"),
            &String::from_str(&env, "IMO1234567"),
        );

        assert_eq!(vessel.compliance_score, 100);
        assert_eq!(vessel.status, VesselStatus::Active);

        let fetched = client.get_vessel(&vessel_id);
        assert_eq!(fetched.name, String::from_str(&env, "Blue Horizon"));
    }

    #[test]
    fn test_compliance_update_suspends_low_score() {
        let (env, contract_id, owner, fisher) = setup();
        let client = VesselRegistryContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);

        let vessel_id = Bytes::from_slice(&env, b"VESSEL002");
        client.register_vessel(
            &owner, &fisher, &vessel_id,
            &String::from_str(&env, "Sea Drift"),
            &String::from_str(&env, "GH"),
            &String::from_str(&env, "IMO9999999"),
        );

        let verifier = Address::generate(&env);
        // Need to set verifier role via admin — re-init for this test
        client.set_role(&admin, &verifier, &Role::Verifier);
        client.update_compliance(&verifier, &vessel_id, &10);

        let vessel = client.get_vessel(&vessel_id);
        assert_eq!(vessel.status, VesselStatus::Suspended);
    }

    #[test]
    #[should_panic]
    fn test_duplicate_vessel_rejected() {
        let (env, contract_id, owner, fisher) = setup();
        let client = VesselRegistryContractClient::new(&env, &contract_id);
        let vessel_id = Bytes::from_slice(&env, b"VESSEL003");

        client.register_vessel(
            &owner, &fisher, &vessel_id,
            &String::from_str(&env, "Tide Runner"),
            &String::from_str(&env, "CI"),
            &String::from_str(&env, "IMO1111111"),
        );
        // Second registration must panic
        client.register_vessel(
            &owner, &fisher, &vessel_id,
            &String::from_str(&env, "Tide Runner"),
            &String::from_str(&env, "CI"),
            &String::from_str(&env, "IMO1111111"),
        );
    }
}
