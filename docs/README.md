# 🌏EcoNexus Documentation

Welcome to **EcoNexus** - the revolutionary AI-Governed DAO that's transforming climate action through hybrid intelligence! This comprehensive platform combines cutting-edge artificial intelligence with human wisdom to fund and govern climate impact projects on Algorand's carbon-negative blockchain.

## World-Changing Innovation

TerraLinke isn't just another climate platform - it's the future of environmental governance. We're pioneering a new era where AI-powered analysis meets community wisdom to create unprecedented climate impact. Built on Algorand's carbon-negative infrastructure, TerraLinke is ready to scale globally and revolutionize how we fund, evaluate, and manage climate solutions.

### Revolutionary Features

- **AI-Powered Proposal Analysis**: Advanced Google Gemini API integration provides comprehensive environmental impact scoring
- **Advanced Voting System**: Real-time voting with transaction confirmation and comprehensive vote tracking
- **Hybrid Governance**: Optimal decision-making through AI insights combined with community participation
- **Intelligent Storage Management**: Aggressive 200KB localStorage optimization with automatic cleanup
- **Performance-Optimized**: Dynamic imports and lazy loading for lightning-fast user experience
- **Algorand Integration**: Leveraging the world's most sustainable blockchain infrastructure
- **Real-time Impact Analytics**: Comprehensive environmental metrics and project performance tracking
- **Smart Contract Automation**: Transparent, trustless funding distribution and governance

## Production-Ready Features

### Advanced Voting Logic
- **Real-time Vote Tracking**: Instant confirmation with transaction IDs
- **Vote Persistence**: Votes stored across sessions with aggressive storage optimization
- **Smart Vote Validation**: Prevention of duplicate voting with blockchain verification
- **Vote Analytics**: Comprehensive tracking of voting patterns and outcomes

### Intelligent Storage Management
- **200KB Limit Optimization**: Aggressive localStorage management for mobile compatibility
- **Automatic Cleanup**: Expired proposals removed every 30 minutes
- **Smart Compression**: Optimized data structures for maximum efficiency
- **Real-time Monitoring**: Storage usage tracking with alerts

### Performance Engineering
- **Dynamic Imports**: Lazy loading of heavy components for instant page loads
- **Optimized Bundles**: Homepage loads in under 14KB for lightning-fast experience
- **Smart Caching**: Intelligent proposal caching with automatic invalidation
- **Mobile-First**: Responsive design optimized for all devices

## Documentation Structure

| Document | Description |
|----------|-------------|
| [Introduction](./1.Introduction.md) | Project overview, mission, and vision |
| [System Overview](./2.System%20Overview.md) | High-level architecture and components |
| [Architecture](./3.Architecture.md) | Technical architecture and design patterns |
| [Core Components](./4.Core%20Components.md) | Detailed component specifications |
| [Smart Contracts](./5.%20Smart%20Contracts.md) | Algorand smart contract implementation |
| [AI Governance System](./6.%20AI%20Governance%20System.md) | AI analysis and decision-making system |
| [Climate Impact Credits](./7.%20Climate%20Impact%20Credits.md) | Carbon credit tokenization and management |
| [Token Economics](./8.%20Token%20Economics.md) | Economic model and tokenomics |
| [Governance Framework](./9.Governance%20Framework.md) | DAO governance structure and processes |

## World-Changing Capabilities

### 1. Revolutionary Hybrid Governance
- **AI-Enhanced Analysis**: Google Gemini evaluates environmental impact with scientific precision
- **Community Empowerment**: Transparent voting system with real-time confirmation
- **Optimal Decision Making**: Perfect balance of artificial intelligence and human wisdom
- **Global Scalability**: Ready to handle millions of proposals and participants

### 2. Advanced Climate Project Management
- **Intelligent Proposal System**: AI-powered submission and evaluation
- **Real-time Vote Tracking**: Instant confirmation with blockchain verification
- **Automated Impact Assessment**: Continuous monitoring of environmental outcomes
- **Smart Funding Distribution**: Trustless, automated capital allocation

### 3. Next-Generation User Experience
- **Lightning-Fast Performance**: Sub-15KB homepage loads with dynamic imports
- **Mobile-Optimized**: Perfect experience across all devices
- **Storage Intelligence**: Aggressive 200KB optimization for global accessibility
- **Real-time Analytics**: Live impact metrics and governance statistics

### 4. Enterprise-Grade Security
- **Algorand Blockchain**: Military-grade security with carbon-negative operations
- **Multi-Wallet Support**: Secure integration with leading Web3 wallets
- **Smart Contract Automation**: Transparent, auditable governance
- **Data Integrity**: Immutable record-keeping for all climate actions

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.8+ (for AlgoKit)
- Algorand wallet (Pera Wallet recommended)
- Google Gemini API key (for AI analysis)

### Environment Setup

1. **Obtain repository source**: Use your preferred method to get a copy of the project (internal distribution or provided archive).

2. **Frontend Setup (Production-Ready):**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Configure environment variables
   npm run dev   # Development
   npm run build # Production build
   ```

3. **Smart Contract Setup:**
   ```bash
   cd contracts/climate-dao
   algokit project bootstrap all
   algokit project run build
   ```

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Base URL (Updated for TerraLinke)
NEXT_PUBLIC_BASE_URL=https://terralinke.vercel.app

# AI Configuration
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Algorand Configuration
NEXT_PUBLIC_ALGORAND_NETWORK=testnet
NEXT_PUBLIC_ALGORAND_NODE_URL=https://testnet-api.algonode.cloud
NEXT_PUBLIC_INDEXER_URL=https://testnet-idx.algonode.cloud

# Smart Contract IDs (configure after deployment)
NEXT_PUBLIC_CLIMATE_DAO_CONTRACT_ID=
NEXT_PUBLIC_GOVERNANCE_TOKEN_CONTRACT_ID=
```

## Project Structure

```
AI-G-DAO/
├── backend/                 # Backend services (future implementation)
├── contracts/              
│   └── climate-dao/        # Algorand smart contracts
│       ├── smart_contracts/ # Contract source code
│       └── projects/       # AlgoKit project configuration
├── docs/                   # Project documentation
├── frontend/               # Next.js React application
│   ├── app/               # Next.js 13+ app router
│   ├── components/        # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility libraries

```

## Technology Stack

### Frontend (Production-Optimized)
- **Next.js 15.2.4** - Latest React framework with app router
- **TypeScript** - Type-safe development for reliability
- **Tailwind CSS** - Utility-first CSS with custom optimizations
- **Radix UI** - Accessible, production-ready components
- **Lucide React** - Optimized icon library
- **Dynamic Imports** - Performance-first architecture

### Blockchain & Web3
- **Algorand** - Carbon-negative blockchain (99% energy reduction vs. Bitcoin)
- **AlgoKit** - Professional Algorand development framework
- **Pera Wallet Integration** - Seamless wallet connectivity
- **Smart Contract Automation** - Trustless governance and funding

### AI & Innovation
- **Google Gemini API** - Advanced AI proposal analysis
- **Custom Impact Scoring** - Proprietary environmental assessment algorithms
- **Hybrid Intelligence** - AI + Human collaboration system

### Performance & Optimization
- **Aggressive Caching** - Smart data management with 200KB limits
- **Bundle Optimization** - Sub-15KB homepage loads
- **Mobile-First Design** - Responsive across all devices
- **Real-time Updates** - Live voting and analytics

## Ready to Transform the World

TerraLinke represents the convergence of three revolutionary technologies:
- **Artificial Intelligence** for unprecedented analytical capability
- **Blockchain Technology** for transparent, secure, and sustainable operations  
- **Community Governance** for democratic, participatory decision-making

This platform is engineered to scale globally and handle the climate crisis with the urgency and intelligence it demands. From local community projects to multinational climate initiatives, TerraLinke provides the infrastructure for a sustainable future.

## Contributing

We welcome contributions from the community! Please see our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Code style and standards
- Development workflow
- Pull request process
- Issue reporting guidelines

## License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## Links

- **Website**: [EcoNexus](https://terralinke.vercel.app)
- **Algorand**: [Official Website](https://algorand.com)

## Support & Community

Join the EcoNexus community:

1. Explore the [comprehensive documentation](./README.md)
2. Join our growing community of climate innovators

---

**TerraLinke** - Where AI meets humanity to save our planet  
Powered by Algorand's carbon-negative blockchain for maximum environmental impact.

*Ready to revolutionize climate action? The future starts here.*
