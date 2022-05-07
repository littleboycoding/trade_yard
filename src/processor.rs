use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    program_option::COption,
    program_pack::*,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction::create_account,
    sysvar::Sysvar,
};
use spl_token::{
    check_program_account,
    instruction::transfer,
    state::{Account, Mint},
};

use crate::{
    instruction::{Args, TradeYardInstruction},
    state::ItemMetadata,
};

pub fn instruction_processor(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let (instruction, args) = TradeYardInstruction::unpack(instruction_data)?;

    Ok(match instruction {
        TradeYardInstruction::Sell => sell(program_id, accounts, args)?,
        TradeYardInstruction::Buy => buy(program_id, accounts, args)?,
        TradeYardInstruction::Cancel => cancel(program_id, accounts, args)?,
    })
}

fn sell(program_id: &Pubkey, accounts: &[AccountInfo], args: Args) -> ProgramResult {
    msg!("Sell instruction");

    let accounts_info_iter = &mut accounts.iter();

    let seller = next_account_info(accounts_info_iter)?;
    let item = next_account_info(accounts_info_iter)?;
    let mint = next_account_info(accounts_info_iter)?;
    let item_metadata = next_account_info(accounts_info_iter)?;
    let payment_token = next_account_info(accounts_info_iter)?;
    let _sys_program = next_account_info(accounts_info_iter)?;

    check_program_account(mint.owner)?;
    check_program_account(item.owner)?;
    check_program_account(payment_token.owner)?;

    // Validate non-fungible-token
    if {
        let data = Mint::unpack(*mint.data.borrow())?;
        data.mint_authority != COption::None || data.supply != 1 || !data.is_initialized
    } {
        return Err(ProgramError::InvalidAccountData);
    }

    // Verify transfered token
    if {
        let data = Account::unpack(*item.data.borrow())?;
        data.owner != crate::find_item_address(mint.key).0
            || data.amount != 1
            || data.mint != *mint.key
            || !data.is_initialized()
    } {
        return Err(ProgramError::InvalidAccountData);
    }

    msg!("{:?}", payment_token);
    // Validate payment token
    Account::unpack(*payment_token.data.borrow())?;

    let rent = Rent::get()?;

    let metadata = ItemMetadata {
        seller: seller.key.clone(),
        mint: mint.key.clone(),
        payment_token: payment_token.key.clone(),
        lamports: args.lamports.unwrap(),
        program_wallet: item.key.clone(),
    };

    let space = metadata.try_to_vec().unwrap().len();
    let rent_lamports = rent.minimum_balance(space);

    // Create Metadata account
    invoke_signed(
        &create_account(
            seller.key,
            item_metadata.key,
            rent_lamports,
            space.try_into().unwrap(),
            program_id,
        ),
        &[seller.clone(), item_metadata.clone()],
        &[&[
            crate::ITEM_METADATA_SEED,
            &mint.key.to_bytes(),
            &[args.metadata_bump.unwrap()],
        ]],
    )?;

    metadata.serialize(&mut *item_metadata.data.borrow_mut())?;

    msg!(
        "Mint {} sold !, metadata can is created at {}",
        mint.key,
        item_metadata.key
    );

    Ok(())
}

fn buy(program_id: &Pubkey, accounts: &[AccountInfo], _args: Args) -> ProgramResult {
    msg!("Buy instruction");
    let accounts_info_iter = &mut accounts.iter();

    let buyer = next_account_info(accounts_info_iter)?;
    let buyer_wallet = next_account_info(accounts_info_iter)?;
    let buyer_receive_wallet = next_account_info(accounts_info_iter)?;
    let program_wallet = next_account_info(accounts_info_iter)?;
    let payment_wallet = next_account_info(accounts_info_iter)?;
    let metadata = next_account_info(accounts_info_iter)?;
    let spl_token = next_account_info(accounts_info_iter)?;
    let item = next_account_info(accounts_info_iter)?;
    // let _mint = next_account_info(accounts_info_iter)?;

    if metadata.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }

    let metadata_data = ItemMetadata::try_from_slice(*metadata.data.borrow())?;

    // Transfer from buyer to seller
    invoke(
        &transfer(
            spl_token.key,
            buyer_wallet.key,
            &metadata_data.payment_token,
            buyer.key,
            &[],
            metadata_data.lamports,
        )?,
        &[buyer_wallet.clone(), payment_wallet.clone(), buyer.clone()],
    )?;

    let (item_addr, item_bump) = crate::find_item_address(&metadata_data.mint);

    // Transfer NFT from trade yard to buyer
    invoke_signed(
        &transfer(
            spl_token.key,
            &metadata_data.program_wallet,
            buyer_receive_wallet.key,
            &item_addr,
            &[],
            1,
        )?,
        &[program_wallet.clone(), buyer_receive_wallet.clone(), item.clone()],
        &[&[
            crate::ITEM_SEED,
            &metadata_data.mint.to_bytes(),
            &[item_bump],
        ]],
    )?;
    //
    // Destroy metadata
    let metadata_lamports = metadata.lamports();

    **buyer.lamports.borrow_mut() = buyer.lamports().checked_add(metadata_lamports).unwrap();
    **metadata.lamports.borrow_mut() = 0;

    metadata.data.borrow_mut().fill(0);


    msg!("Bought {}", metadata_data.mint);

    Ok(())
}

fn cancel(program_id: &Pubkey, accounts: &[AccountInfo], _args: Args) -> ProgramResult {
    let accounts_info_iter = &mut accounts.iter();

    let seller = next_account_info(accounts_info_iter)?;
    let metadata = next_account_info(accounts_info_iter)?;
    let spl_token = next_account_info(accounts_info_iter)?;
    let program_wallet = next_account_info(accounts_info_iter)?;
    let seller_wallet = next_account_info(accounts_info_iter)?;
    let item = next_account_info(accounts_info_iter)?;

    if !seller.is_signer {
        return Err(ProgramError::MissingRequiredSignature);
    }

    if metadata.owner != program_id {
        return Err(ProgramError::IllegalOwner);
    }

    let metadata_data = ItemMetadata::try_from_slice(*metadata.data.borrow())?;

    if metadata_data.seller != *seller.key {
        return Err(ProgramError::InvalidAccountData);
    }

    let (item_addr, item_bump) = crate::find_item_address(&metadata_data.mint);

    // Transfer NFT back to seller
    invoke_signed(
        &transfer(
            spl_token.key,
            &metadata_data.program_wallet,
            seller_wallet.key,
            &item_addr,
            &[],
            1,
        )?,
        &[program_wallet.clone(), seller_wallet.clone(), item.clone()],
        &[&[
            crate::ITEM_SEED,
            &metadata_data.mint.to_bytes(),
            &[item_bump],
        ]],
    )?;

    // Destroy metadata
    let metadata_lamports = metadata.lamports();

    **seller.lamports.borrow_mut() = seller.lamports().checked_add(metadata_lamports).unwrap();
    **metadata.lamports.borrow_mut() = 0;

    metadata.data.borrow_mut().fill(0);

    msg!("Cancel mint {}", metadata_data.mint);

    Ok(())
}
