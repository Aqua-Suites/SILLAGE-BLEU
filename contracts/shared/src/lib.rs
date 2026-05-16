#![no_std]
use soroban_sdk::{contracttype, Address, Bytes, String};

/// Roles in the Sillage Bleu system
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum Role {
    Fisher,
    VesselOwner,
    Verifier,
    EsgAuditor,
    Admin,
}

/// Vessel registration status
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum VesselStatus {
    Pending,
    Active,
    Suspended,
    Deregistered,
}

/// Catch verification outcome
#[contracttype]
#[derive(Clone, PartialEq)]
pub enum VerificationStatus {
    Pending,
    Approved,
    Rejected,
    Flagged,
}

/// Registered vessel record
#[contracttype]
#[derive(Clone)]
pub struct Vessel {
    pub vessel_id: Bytes,
    pub owner: Address,
    pub fisher: Address,
    pub name: String,
    pub flag_state: String,
    pub imo_number: String,
    pub registered_at: u64,
    pub status: VesselStatus,
    pub compliance_score: u32, // 0-100
}

/// A single catch telemetry event
#[contracttype]
#[derive(Clone)]
pub struct CatchEvent {
    pub catch_id: Bytes,
    pub vessel_id: Bytes,
    pub fisher: Address,
    pub species: String,
    pub weight_kg: u64,
    pub latitude: i64,  // scaled ×1e6
    pub longitude: i64, // scaled ×1e6
    pub timestamp: u64,
    pub status: VerificationStatus,
    pub ipfs_evidence: String, // IPFS CID for photos/docs
}

/// Blue carbon credit record
#[contracttype]
#[derive(Clone)]
pub struct BlueCredit {
    pub credit_id: Bytes,
    pub vessel_id: Bytes,
    pub fisher: Address,
    pub catch_id: Bytes,
    pub amount: u64,           // in micro-credits (1e6 = 1 credit)
    pub sustainability_score: u32, // 0-100
    pub issued_at: u64,
    pub retired: bool,
}

/// ESG impact snapshot
#[contracttype]
#[derive(Clone)]
pub struct EsgSnapshot {
    pub period_start: u64,
    pub period_end: u64,
    pub total_verified_kg: u64,
    pub total_credits_issued: u64,
    pub active_vessels: u32,
    pub avg_sustainability_score: u32,
    pub merkle_root: Bytes, // proof of underlying data
}
