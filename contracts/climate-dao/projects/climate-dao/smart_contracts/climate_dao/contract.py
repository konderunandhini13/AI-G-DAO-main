from algopy import (
    Account, ARC4Contract, BoxMap, Global, Txn, UInt64, gtxn, itxn,
    String, Box, GlobalState, LocalState, Asset, Bytes, arc4
)
from algopy.arc4 import abimethod, UInt64 as ARC4UInt64, String as ARC4String, Bool as ARC4Bool, Struct

# ── Structs for Voting System ──
class ProposalData(Struct):
    title: String
    description: String
    proposal_type: String
    funding_requested: UInt64
    execution_delay: UInt64
    proposer: Account
    creation_time: UInt64
    end_time: UInt64
    status: UInt64


class VoteData(Struct):
    yes_votes: UInt64
    no_votes: UInt64
    abstain_votes: UInt64
    total_voters: UInt64
    total_voting_power_used: UInt64


class VoterRecord(Struct):
    voter: Account
    vote_choice: UInt64
    voting_power_used: UInt64
    timestamp: UInt64


# ── CONTRACT: Core Climate DAO ──
class ClimateDAO(ARC4Contract):
    """Core Climate DAO contract for governance and climate credits"""

    def __init__(self) -> None:
        """Initialize the Climate DAO contract"""
        # DAO tokens and governance
        self.dao_token = Asset(0)        # Climate DAO governance token
        self.credit_token = Asset(0)     # Climate credits token

        # Global state
        self.total_proposals = UInt64(0)
        self.total_members = UInt64(0)
        self.voting_period = UInt64(604800)  # 7 days in seconds

        # Storage maps
        # Proposals and their vote data stored as ARC4-encoded bytes
        self.proposals = BoxMap(UInt64, Bytes, key_prefix="prop_")
        self.proposal_votes = BoxMap(UInt64, Bytes, key_prefix="votes_")

        # Member token holdings: who is a member and their governance power
        self.member_tokens = BoxMap(Account, UInt64, key_prefix="member_")

        # Track if a member has voted on a specific proposal:
        # key = Txn.sender.bytes + proposal_id.bytes, value = 1 if voted
        self.member_voted = BoxMap(Bytes, UInt64, key_prefix="voted_")

        # Local state for tracking user actions
        self.user_proposals_count = LocalState(UInt64, key="user_proposals")
        self.user_votes_count = LocalState(UInt64, key="user_votes")

    # ─────────────────────────────────────────────────────────────
    # Token creation & membership
    # ─────────────────────────────────────────────────────────────

    @abimethod()
    def create_dao_tokens(self, pay_txn: gtxn.PaymentTransaction) -> None:
        """Create DAO governance token and climate credits token"""
        assert pay_txn.receiver == Global.current_application_address
        assert pay_txn.amount >= 2_000_000, "Need at least 2 ALGO for token creation"
        assert Txn.sender == Global.creator_address, "Only creator can initialize tokens"
        assert not self.dao_token, "DAO tokens already created"

        # Create DAO governance token
        dao_token_creation = itxn.AssetConfig(
            total=1_000_000_000,  # 1 billion tokens
            decimals=6,
            unit_name="CDAO",
            asset_name="Climate DAO Token",
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            fee=0,
        ).submit()

        # Create climate credits token
        credit_token_creation = itxn.AssetConfig(
            total=10_000_000_000,  # 10 billion credits
            decimals=2,
            unit_name="CCC",
            asset_name="Climate Credit Coin",
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            fee=0,
        ).submit()

        self.dao_token = dao_token_creation.created_asset
        self.credit_token = credit_token_creation.created_asset

    @abimethod()
    def join_dao(self, pay_txn: gtxn.PaymentTransaction) -> UInt64:
        """Join the DAO by paying membership fee and receive governance tokens"""
        assert pay_txn.receiver == Global.current_application_address
        assert pay_txn.amount >= 1_000_000, "Minimum 1 ALGO membership fee required"

        current_tokens, is_member = self.member_tokens.maybe(pay_txn.sender)

        if not is_member:
            # New member - give initial governance tokens
            initial_tokens = UInt64(1000 * 1_000_000)  # 1000 tokens with 6 decimals

            itxn.AssetTransfer(
                asset_receiver=pay_txn.sender,
                xfer_asset=self.dao_token,
                asset_amount=initial_tokens,
                fee=0,
            ).submit()

            self.member_tokens[pay_txn.sender] = initial_tokens
            self.total_members += UInt64(1)

            return initial_tokens
        else:
            # Existing member - add bonus tokens based on contribution
            bonus_tokens = pay_txn.amount  # 1:1 ratio for simplicity

            itxn.AssetTransfer(
                asset_receiver=pay_txn.sender,
                xfer_asset=self.dao_token,
                asset_amount=bonus_tokens,
                fee=0,
            ).submit()

            self.member_tokens[pay_txn.sender] = current_tokens + bonus_tokens

            return self.member_tokens[pay_txn.sender]

    # ─────────────────────────────────────────────────────────────
    # Proposals & voting
    # ─────────────────────────────────────────────────────────────

    @abimethod()
    def submit_proposal(
        self,
        title: ARC4String,
        description: ARC4String,
        funding_amount: ARC4UInt64,
        impact_score: ARC4UInt64,
    ) -> UInt64:
        """Submit a new climate project proposal"""
        member_tokens, is_member = self.member_tokens.maybe(Txn.sender)
        assert is_member, "Only DAO members can submit proposals"
        assert member_tokens >= UInt64(100 * 1_000_000), "Need at least 100 tokens to submit proposal"

        proposal_id = self.total_proposals + UInt64(1)

        # Encode proposal data (kept simple here)
        proposal_data = arc4.encode(
            (
                title,
                description,
                funding_amount,
                impact_score,
                Txn.sender,
                Global.latest_timestamp,
                UInt64(0),  # end_time placeholder
                UInt64(0),  # status placeholder
            )
        )

        self.proposals[proposal_id] = proposal_data
        self.total_proposals = proposal_id

        # Initialize vote data for this proposal
        vote_data = VoteData(
            yes_votes=UInt64(0),
            no_votes=UInt64(0),
            abstain_votes=UInt64(0),
            total_voters=UInt64(0),
            total_voting_power_used=UInt64(0),
        )
        self.proposal_votes[proposal_id] = arc4.encode(vote_data)

        # Track user's proposal count
        user_count = self.user_proposals_count.get(Txn.sender, UInt64(0))
        self.user_proposals_count[Txn.sender] = user_count + UInt64(1)

        return proposal_id

    @abimethod()
    def vote_on_proposal(self, proposal_id: ARC4UInt64, vote: ARC4Bool) -> None:
        """Vote on a proposal (True = Yes, False = No)"""
        member_tokens, is_member = self.member_tokens.maybe(Txn.sender)
        assert is_member, "Only DAO members can vote"
        assert member_tokens > UInt64(0), "Need tokens to vote"

        # Check proposal exists
        _, proposal_exists = self.proposals.maybe(proposal_id.native)
        assert proposal_exists, "Proposal does not exist"

        # Build unique key for (voter, proposal)
        vote_key = Bytes(Txn.sender.bytes + proposal_id.bytes)

        _, already_voted = self.member_voted.maybe(vote_key)
        assert not already_voted, "Already voted on this proposal"

        # Load existing vote data
        encoded_votes, has_votes = self.proposal_votes.maybe(proposal_id.native)
        assert has_votes, "Vote data missing"
        vote_data = arc4.decode(encoded_votes, VoteData)

        # Voting power = member_tokens (change logic if you want 1 wallet = 1 vote)
        voting_power = member_tokens

        if vote:
            vote_data.yes_votes = vote_data.yes_votes + voting_power
        else:
            vote_data.no_votes = vote_data.no_votes + voting_power

        vote_data.total_voters = vote_data.total_voters + UInt64(1)
        vote_data.total_voting_power_used = vote_data.total_voting_power_used + voting_power

        # Save updated votes
        self.proposal_votes[proposal_id.native] = arc4.encode(vote_data)

        # Mark as voted
        self.member_voted[vote_key] = UInt64(1)

        # Track user's vote count
        user_vote_count = self.user_votes_count.get(Txn.sender, UInt64(0))
        self.user_votes_count[Txn.sender] = user_vote_count + UInt64(1)

    @abimethod()
    def execute_proposal(self, proposal_id: ARC4UInt64) -> None:
        """Execute an approved proposal and distribute climate credits (simplified)"""
        assert Txn.sender == Global.creator_address, "Only admin can execute proposals"

        proposal_data, proposal_exists = self.proposals.maybe(proposal_id.native)
        assert proposal_exists, "Proposal does not exist"

        # TODO: check vote results from proposal_votes before executing
        # For now: simple demo payout

        credit_amount = UInt64(1000 * 100)  # 1000 credits with 2 decimals
        recipient = Global.creator_address  # placeholder; use proposer from proposal_data if needed

        itxn.AssetTransfer(
            asset_receiver=recipient,
            xfer_asset=self.credit_token,
            asset_amount=credit_amount,
            fee=0,
        ).submit()

    # ─────────────────────────────────────────────────────────────
    # Read‑only helper methods for frontend
    # ─────────────────────────────────────────────────────────────

    @abimethod(readonly=True)
    def get_dao_token_id(self) -> UInt64:
        """Get the DAO governance token ID"""
        return self.dao_token.id

    @abimethod(readonly=True)
    def get_credit_token_id(self) -> UInt64:
        """Get the climate credits token ID"""
        return self.credit_token.id

    @abimethod(readonly=True)
    def get_member_tokens(self, member: Account) -> UInt64:
        """Get token balance for a member"""
        tokens, is_member = self.member_tokens.maybe(member)
        return tokens if is_member else UInt64(0)

    @abimethod(readonly=True)
    def get_total_proposals(self) -> UInt64:
        """Get total number of proposals"""
        return self.total_proposals

    @abimethod(readonly=True)
    def get_total_members(self) -> UInt64:
        """Get total number of DAO members"""
        return self.total_members

    @abimethod(readonly=True)
    def get_user_proposal_count(self) -> UInt64:
        """Get number of proposals submitted by sender"""
        return self.user_proposals_count.get(Txn.sender, UInt64(0))

    @abimethod(readonly=True)
    def get_user_vote_count(self) -> UInt64:
        """Get number of votes cast by sender"""
        return self.user_votes_count.get(Txn.sender, UInt64(0))

    @abimethod(readonly=True)
    def get_proposal_votes(self, proposal_id: ARC4UInt64) -> VoteData:
        """Return yes/no/abstain and totals for a proposal"""
        encoded_votes, exists = self.proposal_votes.maybe(proposal_id.native)
        assert exists, "Proposal does not exist"
        return arc4.decode(encoded_votes, VoteData)

    @abimethod(readonly=True)
    def has_voted(self, proposal_id: ARC4UInt64, voter: Account) -> ARC4Bool:
        """Check if voter already voted on a proposal"""
        vote_key = Bytes(voter.bytes + proposal_id.bytes)
        _, already_voted = self.member_voted.maybe(vote_key)
        return ARC4Bool(already_voted)

    # ─────────────────────────────────────────────────────────────
    # Opt‑in / opt‑out
    # ─────────────────────────────────────────────────────────────

    @abimethod(allow_actions=["OptIn"])
    def opt_in(self) -> String:
        """Opt into the DAO contract"""
        return String("Welcome to Climate DAO!")

    @abimethod(allow_actions=["CloseOut"])
    def opt_out(self) -> None:
        """Opt out of the DAO contract"""
        pass
