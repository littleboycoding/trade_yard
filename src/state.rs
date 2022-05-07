use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct ItemMetadata {
    pub seller: Pubkey,
    pub payment_token: Pubkey,
    pub mint: Pubkey,
    pub program_wallet: Pubkey,
    pub lamports: u64,
}
