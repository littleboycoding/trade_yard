use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    instruction::{AccountMeta, Instruction},
    program_error::ProgramError,
    pubkey::Pubkey,
    system_program,
};

#[derive(Debug, PartialEq)]
pub enum TradeYardInstruction {
    Sell,
    Buy,
    Cancel,
}

impl TradeYardInstruction {
    pub fn unpack(instruction_data: &[u8]) -> Result<(Self, Args), ProgramError> {
        let payload = Payload::try_from_slice(instruction_data)?;

        let instruction = match payload.instruction {
            0 => Self::Sell,
            1 => Self::Buy,
            2 => Self::Cancel,
            _ => return Err(ProgramError::InvalidInstructionData),
        };

        Ok((instruction, payload.args))
    }
}

#[derive(BorshDeserialize, BorshSerialize, Debug)]
pub struct Payload {
    pub instruction: u8,
    pub args: Args,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Clone, Copy, Debug)]
pub struct Args {
    pub lamports: Option<u64>,
    pub metadata_bump: Option<u8>,
}

pub fn sell(
    seller: &Pubkey,
    program_item_wallet: &Pubkey,
    mint: &Pubkey,
    payment: &Pubkey,
    lamports: u64,
) -> Instruction {
    let (item_metadata_addr, item_metadata_bump) = crate::find_item_metadata_address(mint);

    Instruction::new_with_borsh(
        crate::id(),
        &Payload {
            instruction: 0, // Sell
            args: Args {
                lamports: Some(lamports),
                metadata_bump: Some(item_metadata_bump),
            },
        },
        vec![
            AccountMeta::new(*seller, true),
            AccountMeta::new_readonly(*program_item_wallet, false),
            AccountMeta::new_readonly(*mint, false),
            AccountMeta::new(item_metadata_addr, false),
            AccountMeta::new_readonly(*payment, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    )
}

pub fn cancel(
    seller: &Pubkey,
    program_wallet: &Pubkey,
    seller_wallet: &Pubkey,
    mint: &Pubkey
) -> Instruction {
    Instruction::new_with_borsh(
        crate::id(),
        &Payload {
            instruction: 2, // Sell
            args: Args {
                lamports: None,
                metadata_bump: None,
            },
        },
        vec![
            AccountMeta::new_readonly(*seller, true),
            AccountMeta::new(crate::find_item_metadata_address(mint).0, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new(*program_wallet, false),
            AccountMeta::new(*seller_wallet, false),
            AccountMeta::new_readonly(crate::find_item_address(mint).0, false),
        ],
    )
}

pub fn buy(
    buyer: &Pubkey,
    buyer_wallet: &Pubkey,
    buyer_receiver_wallet: &Pubkey,
    program_wallet: &Pubkey,
    payment_wallet: &Pubkey,
    metadata: &Pubkey,
    item: &Pubkey,
    ) -> Instruction {
    Instruction::new_with_borsh(
        crate::id(),
        &Payload {
            instruction: 1, // Sell
            args: Args {
                lamports: None,
                metadata_bump: None,
            },
        },
        vec![
            AccountMeta::new(*buyer, true),
            AccountMeta::new(*buyer_wallet, false),
            AccountMeta::new(*buyer_receiver_wallet, false),
            AccountMeta::new(*program_wallet, false),
            AccountMeta::new(*payment_wallet, false),
            AccountMeta::new(*metadata, false),
            AccountMeta::new_readonly(spl_token::id(), false),
            AccountMeta::new_readonly(*item, false),
        ],
    )
}
