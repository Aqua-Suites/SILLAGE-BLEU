#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, panic_with_error, symbol_short,
    Address, Bytes, Env,
};
use shared::{BlueCredit, Role};

#[contracttype]
pub enum DataKey {
    Credit(Bytes),
    FisherCredits(Address),
    TotalIssued,
    Role(Address),
    Admin,
}

#[contracterror]
#[derive(Debug, Clone)]
pub enum Error {
    Unauthorized = 1,
    CreditExists = 2,
    CreditNotFound = 3,
    AlreadyRetired = 4,
}

/// Credit issuance: 1 credit per 100 kg of verified catch (micro-credits)
const KG_PER_CREDIT: u64 = 100;
const MICRO: u64 = 1_000_000;

/// Sustainability score factors (weights sum to 100)
/// - Compliance score from vessel registry: 60%
/// - Catch size (smaller = more sustainable): 40%
fn compute_sustainability_score(compliance_score: u32, weight_kg: u64) -> u32 {
    let compliance_part = (compliance_score * 60) / 100;
    // Smaller catches score higher on size factor (max 40 at ≤50kg, 0 at ≥5000kg)
    let size_factor: u32 = if weight_kg <= 50 {
        40
    } else if weight_kg >= 5_000 {
        0
    } else {
        let ratio = (5_000 - weight_kg) as u32;
        (ratio * 40) / 4_950
    };
    (compliance_part + size_factor).min(100)
}

fn compute_credit_amount(weight_kg: u64, sustainability_score: u32) -> u64 {
    let base = (weight_kg / KG_PER_CREDIT) * MICRO;
    // Bonus: up to 50% extra for high sustainability scores
    let bonus = if sustainability_score >= 80 {
        base / 2
    } else if sustainability_score >= 60 {
        base / 4
    } else {
        0
    };
    base + bonus
}

#[contract]
pub struct BlueCreditMintingContract;

#[contractimpl]
impl BlueCreditMintingContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TotalIssued, &0u64);
    }

    pub fn set_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        Self::require_admin(&env, &caller);
        env.storage().persistent().set(&DataKey::Role(target), &role);
    }

    /// Mint blue credits for a verified catch (verifier or admin calls this)
    pub fn mint_credit(
        env: Env,
        caller: Address,
        credit_id: Bytes,
        vessel_id: Bytes,
        fisher: Address,
        catch_id: Bytes,
        weight_kg: u64,
        compliance_score: u32,
    ) -> BlueCredit {
        caller.require_auth();
        Self::require_role(&env, &caller, Role::Verifier);

        if env.storage().persistent().has(&DataKey::Credit(credit_id.clone())) {
            panic_with_error!(&env, Error::CreditExists);
        }

        let sustainability_score = compute_sustainability_score(compliance_score, weight_kg);
        let amount = compute_credit_amount(weight_kg, sustainability_score);

        let credit = BlueCredit {
            credit_id: credit_id.clone(),
            vessel_id,
            fisher: fisher.clone(),
            catch_id,
            amount,
            sustainability_score,
            issued_at: env.ledger().timestamp(),
            retired: false,
        };

        env.storage().persistent().set(&DataKey::Credit(credit_id.clone()), &credit);

        // Track per fisher
        let mut fc: soroban_sdk::Vec<Bytes> = env
            .storage().persistent()
            .get(&DataKey::FisherCredits(fisher.clone()))
            .unwrap_or(soroban_sdk::Vec::new(&env));
        fc.push_back(credit_id.clone());
        env.storage().persistent().set(&DataKey::FisherCredits(fisher), &fc);

        // Update total
        let total: u64 = env.storage().instance().get(&DataKey::TotalIssued).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalIssued, &(total + amount));

        env.events().publish(
            (symbol_short!("credit"), symbol_short!("minted")),
            (credit_id, amount, sustainability_score),
        );

        credit
    }

    /// Retire a credit (soulbound — only the fisher can retire their own)
    pub fn retire_credit(env: Env, fisher: Address, credit_id: Bytes) {
        fisher.require_auth();

        let mut credit: BlueCredit = env
            .storage().persistent()
            .get(&DataKey::Credit(credit_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::CreditNotFound));

        if credit.retired {
            panic_with_error!(&env, Error::AlreadyRetired);
        }
        if credit.fisher != fisher {
            panic_with_error!(&env, Error::Unauthorized);
        }

        credit.retired = true;
        env.storage().persistent().set(&DataKey::Credit(credit_id.clone()), &credit);

        env.events().publish(
            (symbol_short!("credit"), symbol_short!("retired")),
            credit_id,
        );
    }

    pub fn get_credit(env: Env, credit_id: Bytes) -> BlueCredit {
        env.storage().persistent()
            .get(&DataKey::Credit(credit_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::CreditNotFound))
    }

    pub fn get_total_issued(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalIssued).unwrap_or(0)
    }

    pub fn get_fisher_credits(env: Env, fisher: Address) -> soroban_sdk::Vec<Bytes> {
        env.storage().persistent()
            .get(&DataKey::FisherCredits(fisher))
            .unwrap_or(soroban_sdk::Vec::new(&env))
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
    fn test_mint_and_score() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, BlueCreditMintingContract);
        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        let fisher = Address::generate(&env);

        let client = BlueCreditMintingContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_role(&admin, &verifier, &Role::Verifier);

        let credit = client.mint_credit(
            &verifier,
            &Bytes::from_slice(&env, b"CREDIT001"),
            &Bytes::from_slice(&env, b"VESSEL001"),
            &fisher,
            &Bytes::from_slice(&env, b"CATCH001"),
            &500u64,
            &90u32,
        );

        // 500kg / 100 = 5 base credits × 1e6, + 50% bonus for score ≥80
        assert_eq!(credit.amount, 7_500_000);
        assert!(credit.sustainability_score > 0);
    }

    #[test]
    fn test_sustainability_score_deterministic() {
        assert_eq!(compute_sustainability_score(100, 50), 100);
        assert_eq!(compute_sustainability_score(0, 5_000), 0);
    }

    #[test]
    #[should_panic]
    fn test_retire_by_non_owner_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, BlueCreditMintingContract);
        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        let fisher = Address::generate(&env);
        let attacker = Address::generate(&env);

        let client = BlueCreditMintingContractClient::new(&env, &contract_id);
        client.initialize(&admin);
        client.set_role(&admin, &verifier, &Role::Verifier);

        client.mint_credit(
            &verifier,
            &Bytes::from_slice(&env, b"CREDIT002"),
            &Bytes::from_slice(&env, b"V001"),
            &fisher,
            &Bytes::from_slice(&env, b"C001"),
            &200u64, &80u32,
        );

        client.retire_credit(&attacker, &Bytes::from_slice(&env, b"CREDIT002"));
    }
}
