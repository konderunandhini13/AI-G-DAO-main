from algopy import (
    ARC4Contract,
    Account,
    Global,
    GlobalState,
    Txn,
    UInt64,
    itxn,
    op,
)
from algopy.arc4 import abimethod, String, Bool


class MilestoneDAO(ARC4Contract):
    """
    MilestoneDAO Smart Contract
    - Holds ALGO funds sent to its address
    - Proposer triggers release after community approves
    - Contract pays proposer directly on-chain
    - Sequential: each milestone unlocks after previous released
    """

    proposer: GlobalState[Account]
    total_milestones: GlobalState[UInt64]
    current_milestone: GlobalState[UInt64]
    proposal_id: GlobalState[UInt64]

    def __init__(self) -> None:
        self.proposer = GlobalState(Account)
        self.total_milestones = GlobalState(UInt64)
        self.current_milestone = GlobalState(UInt64)
        self.proposal_id = GlobalState(UInt64)

    @abimethod(create="require")
    def create(
        self,
        proposer: Account,
        total_milestones: UInt64,
        proposal_id: UInt64,
    ) -> None:
        self.proposer.value = proposer
        self.total_milestones.value = total_milestones
        self.current_milestone.value = UInt64(0)
        self.proposal_id.value = proposal_id

    @abimethod()
    def release(self, milestone_idx: UInt64, amount_microalgos: UInt64) -> String:
        """
        Release funds for approved milestone.
        Only proposer can call. Pays proposer from contract balance.
        """
        assert Txn.sender == self.proposer.value, "Only proposer can release"
        assert milestone_idx == self.current_milestone.value, "Not the active milestone"
        assert amount_microalgos > UInt64(0), "Amount must be positive"
        assert (
            op.balance(Global.current_application_address) >= amount_microalgos + Global.min_txn_fee
        ), "Insufficient contract balance"

        # Send ALGO from contract to proposer
        itxn.Payment(
            receiver=self.proposer.value,
            amount=amount_microalgos,
            fee=Global.min_txn_fee,
        ).submit()

        # Advance to next milestone
        self.current_milestone.value = milestone_idx + UInt64(1)

        return String("released")

    @abimethod()
    def get_current_milestone(self) -> UInt64:
        return self.current_milestone.value

    @abimethod()
    def get_balance(self) -> UInt64:
        return op.balance(Global.current_application_address)

    @abimethod(allow_actions=["DeleteApplication"])
    def delete(self) -> None:
        assert Txn.sender == Global.creator_address, "Only creator can delete"
        itxn.Payment(
            receiver=Global.creator_address,
            amount=op.balance(Global.current_application_address) - Global.min_txn_fee,
            fee=Global.min_txn_fee,
            close_remainder_to=Global.creator_address,
        ).submit()
