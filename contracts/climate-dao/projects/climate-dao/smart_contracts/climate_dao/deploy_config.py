
DAO_ADMIN = "33FPGTKRHHYWOZQWNQB6EOA67O3UTIZKMXM7JUJDXPMHVWTWBL4L4HDBUU"  # Your TestNet address

# Token configuration
DAO_TOKEN_CONFIG = {
    "name": "Climate DAO Token",
    "unit": "CDAO",
    "total_supply": 1_000_000_000,
    "decimals": 6
}

CREDIT_TOKEN_CONFIG = {
    "name": "Climate Credit Coin",
    "unit": "CCC",
    "total_supply": 10_000_000_000,
    "decimals": 2
}

# Voting settings
DEFAULT_VOTING_PARAMETERS = {
    "voting_period_secs": 604800,
    "quorum_threshold": 51,
    "approval_threshold": 60,
    "min_power_to_propose": 1000
}
