import algokit_utils
import algosdk
from pathlib import Path
import json

# TestNet connection
algod_client = algokit_utils.AlgorandClient.testnet()

# Load compiled contract
arc56_path = Path(__file__).parent / "MilestoneDAO.arc56.json"
arc56 = json.loads(arc56_path.read_text())

print("MilestoneDAO contract compiled and ready to deploy.")
print("ARC56 methods:", [m["name"] for m in arc56.get("methods", [])])
print("\nTo deploy:")
print("1. Fund a deployer account on TestNet")
print("2. Call create() with proposer address, total_milestones, proposal_id")
print("3. Send ALGO to the contract address")
print("4. Proposer calls release() after community approves each milestone")
print("\nContract address will hold funds — no seed phrase sharing needed!")
