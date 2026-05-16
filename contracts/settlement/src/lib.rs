#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, panic_with_error, symbol_short,
    token, Address, Bytes, Env, Vec,
};
use shared::Role;

#[contracttype]
pub enum DataKey {
    Payout(Bytes),
    PendingPayouts,
    Role(Address),
    Admin,
    Token,
}

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum PayoutStatus {
    Pending,
    Executed,
    Failed,
}

#[contracttype]
#[derive(Clone)]
pub struct PayoutRecord {
    pub payout_id: Bytes,
    pub fisher: Address,
    pub amount: i128,
    pub catch_id: Bytes,
    pub status: PayoutStatus,
    pub created_at: u64,
    pub executed_at: u64,
}

#[contracttype]
#[derive(Clone)]
pub struct BatchPayoutItem {
    pub payout_id: Bytes,
    pub fisher: Address,
    pub amount: i128,
    pub catch_id: Bytes,
}

#[contracttype]
#[derive(Clone)]
pub enum Error {
    Unauthorized = 1,
    PayoutExists = 2,
    PayoutNotFound = 3,
    AlreadyExecuted = 4,
    InsufficientFunds = 5,
}

impl soroban_sdk::contracterror::ContractError for Error {
    fn as_u32(&self) -> u32 {
        self.clone() as u32
    }
}

#[contract]
pub struct SettlementContract;

#[contractimpl]
impl SettlementContract {
    pub fn initialize(env: Env, admin: Address, token: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic_with_error!(&env, Error::Unauthorized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
    }

    pub fn set_role(env: Env, caller: Address, target: Address, role: Role) {
        caller.require_auth();
        Self::require_admin(&env, &caller);
        env.storage().persistent().set(&DataKey::Role(target), &role);
    }

    /// Queue a payout for a fisher
    pub fn queue_payout(
        env: Env,
        caller: Address,
        payout_id: Bytes,
        fisher: Address,
        amount: i128,
        catch_id: Bytes,
    ) -> PayoutRecord {
        caller.require_auth();
        Self::require_role(&env, &caller, Role::Verifier);

        if env.storage().persistent().has(&DataKey::Payout(payout_id.clone())) {
            panic_with_error!(&env, Error::PayoutExists);
        }

        let record = PayoutRecord {
            payout_id: payout_id.clone(),
            fisher,
            amount,
            catch_id,
            status: PayoutStatus::Pending,
            created_at: env.ledger().timestamp(),
            executed_at: 0,
        };

        env.storage().persistent().set(&DataKey::Payout(payout_id.clone()), &record);

        // Add to pending list
        let mut pending: Vec<Bytes> = env
            .storage().instance()
            .get(&DataKey::PendingPayouts)
            .unwrap_or(Vec::new(&env));
        pending.push_back(payout_id.clone());
        env.storage().instance().set(&DataKey::PendingPayouts, &pending);

        env.events().publish(
            (symbol_short!("payout"), symbol_short!("queued")),
            (payout_id, amount),
        );

        record
    }

    /// Execute a single payout
    pub fn execute_payout(env: Env, caller: Address, payout_id: Bytes) -> PayoutRecord {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let mut record: PayoutRecord = env
            .storage().persistent()
            .get(&DataKey::Payout(payout_id.clone()))
            .unwrap_or_else(|| panic_with_error!(&env, Error::PayoutNotFound));

        if record.status == PayoutStatus::Executed {
            panic_with_error!(&env, Error::AlreadyExecuted);
        }

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);

        token_client.transfer(&env.current_contract_address(), &record.fisher, &record.amount);

        record.status = PayoutStatus::Executed;
        record.executed_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::Payout(payout_id.clone()), &record);

        env.events().publish(
            (symbol_short!("payout"), symbol_short!("exec")),
            (payout_id, record.amount),
        );

        record
    }

    /// Batch execute multiple payouts in one transaction
    pub fn batch_execute(env: Env, caller: Address, payout_ids: Vec<Bytes>) -> u32 {
        caller.require_auth();
        Self::require_admin(&env, &caller);

        let token_addr: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let token_client = token::Client::new(&env, &token_addr);
        let mut executed: u32 = 0;

        for payout_id in payout_ids.iter() {
            let key = DataKey::Payout(payout_id.clone());
            if let Some(mut record) = env.storage().persistent().get::<DataKey, PayoutRecord>(&key) {
                if record.status == PayoutStatus::Pending {
                    token_client.transfer(
                        &env.current_contract_address(),
                        &record.fisher,
                        &record.amount,
                    );
                    record.status = PayoutStatus::Executed;
                    record.executed_at = env.ledger().timestamp();
                    env.storage().persistent().set(&key, &record);
                    executed += 1;
                }
            }
        }

        env.events().publish(
            (symbol_short!("batch"), symbol_short!("exec")),
            executed,
        );

        executed
    }

    pub fn get_payout(env: Env, payout_id: Bytes) -> PayoutRecord {
        env.storage().persistent()
            .get(&DataKey::Payout(payout_id))
            .unwrap_or_else(|| panic_with_error!(&env, Error::PayoutNotFound))
    }

    pub fn get_pending_payouts(env: Env) -> Vec<Bytes> {
        env.storage().instance()
            .get(&DataKey::PendingPayouts)
            .unwrap_or(Vec::new(&env))
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
    use soroban_sdk::{
        testutils::{Address as _, MockAuth, MockAuthInvoke},
        Env,
    };

    #[test]
    fn test_queue_payout() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, SettlementContract);
        let admin = Address::generate(&env);
        let verifier = Address::generate(&env);
        let fisher = Address::generate(&env);
        let token = Address::generate(&env);

        let client = SettlementContractClient::new(&env, &contract_id);
        client.initialize(&admin, &token);
        client.set_role(&admin, &verifier, &Role::Verifier);

        let record = client.queue_payout(
            &verifier,
            &Bytes::from_slice(&env, b"PAY001"),
            &fisher,
            &1_000_000i128,
            &Bytes::from_slice(&env, b"CATCH001"),
        );

        assert_eq!(record.status, PayoutStatus::Pending);
        assert_eq!(record.amount, 1_000_000i128);
    }
}
