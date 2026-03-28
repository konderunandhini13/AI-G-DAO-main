"""
Deploy MilestoneDAO smart contract to Algorand TestNet.
Run: poetry run python smart_contracts/milestone_dao/deploy_contract.py
"""
import algosdk
import json
from pathlib import Path

ALGOD_URL = "https://testnet-api.algonode.cloud"
ALGOD_TOKEN = ""

# Load compiled TEAL
base = Path(__file__).parent
approval_teal = (base / "MilestoneDAO.approval.teal").read_text()
clear_teal = (base / "MilestoneDAO.clear.teal").read_text()

def deploy(deployer_mnemonic: str, proposer_address: str, total_milestones: int, proposal_id: int):
    algod = algosdk.v2client.algod.AlgodClient(ALGOD_TOKEN, ALGOD_URL)

    # Deployer account
    private_key = algosdk.mnemonic.to_private_key(deployer_mnemonic)
    deployer_address = algosdk.account.address_from_private_key(private_key)
    print(f"Deployer: {deployer_address}")

    # Check balance
    info = algod.account_info(deployer_address)
    print(f"Balance: {info['amount'] / 1e6} ALGO")
    if info['amount'] < 500_000:
        print("ERROR: Need at least 0.5 ALGO to deploy. Fund this address first:")
        print(f"  https://testnet.algoexplorer.io/dispenser")
        print(f"  Address: {deployer_address}")
        return None

    # Compile TEAL
    approval_result = algod.compile(approval_teal)
    clear_result = algod.compile(clear_teal)
    approval_program = algosdk.encoding.base64.b64decode(approval_result["result"])
    clear_program = algosdk.encoding.base64.b64decode(clear_result["result"])

    # Build create txn
    sp = algod.suggested_params()
    
    # ABI encode the create args: proposer (address), total_milestones (uint64), proposal_id (uint64)
    method_selector = algosdk.abi.Method.from_signature("create(address,uint64,uint64)void").get_selector()
    
    addr_type = algosdk.abi.AddressType()
    uint64_type = algosdk.abi.UintType(64)
    
    encoded_args = [
        method_selector,
        addr_type.encode(proposer_address),
        uint64_type.encode(total_milestones),
        uint64_type.encode(proposal_id),
    ]

    txn = algosdk.transaction.ApplicationCreateTxn(
        sender=deployer_address,
        sp=sp,
        on_complete=algosdk.transaction.OnComplete.NoOpOC,
        approval_program=approval_program,
        clear_program=clear_program,
        global_schema=algosdk.transaction.StateSchema(num_uints=4, num_byte_slices=1),
        local_schema=algosdk.transaction.StateSchema(num_uints=0, num_byte_slices=0),
        app_args=encoded_args,
    )

    signed = txn.sign(private_key)
    tx_id = algod.send_transaction(signed)
    print(f"Deploy txn: {tx_id}")

    # Wait for confirmation
    result = algosdk.transaction.wait_for_confirmation(algod, tx_id, 10)
    app_id = result["application-index"]
    app_address = algosdk.logic.get_application_address(app_id)

    print(f"\n✅ CONTRACT DEPLOYED!")
    print(f"   App ID:      {app_id}")
    print(f"   App Address: {app_address}")
    print(f"\nNext: Send ALGO to {app_address} to fund the contract")
    print(f"Then update NEXT_PUBLIC_CONTRACT_APP_ID={app_id} in Vercel env vars")

    return app_id, app_address


if __name__ == "__main__":
    import sys

    print("=== MilestoneDAO Deployer ===")
    print("Enter the mnemonic of the account that will deploy (needs ~0.5 ALGO):")
    mnemonic = input("> ").strip()

    print("Enter the proposer's Algorand address:")
    proposer = input("> ").strip()

    print("Total milestones (e.g. 3):")
    total = int(input("> ").strip())

    print("Proposal ID (any number, e.g. 1):")
    pid = int(input("> ").strip())

    deploy(mnemonic, proposer, total, pid)
