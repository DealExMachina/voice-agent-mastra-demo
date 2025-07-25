# Voice Agent Mastra Demo

<div align="center">

![Voice Agent Logo](https://img.shields.io/badge/Voice%20Agent-Mastra%20Demo-blue?style=for-the-badge&logo=microphone&logoColor=white)

[![Build Status](https://img.shields.io/github/actions/workflow/status/DealExMachina/voice-agent-mastra-demo/ci.yml?branch=main&style=flat-square)](https://github.com/DealExMachina/voice-agent-mastra-demo/actions)
[![License](https://img.shields.io/github/license/DealExMachina/voice-agent-mastra-demo?style=flat-square)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.19.4-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)

**A modern, production-ready voice agent application built with Mastra, mem0, and LiveKit**

[🚀 Live Demo](https://voice-agent-mastra-demo.vercel.app) • [📚 Documentation](#documentation) • [🛠️ Contributing](#contributing) • [💬 Support](#support)

</div>

---

## 🌟 Overview

Voice Agent Mastra Demo is a cutting-edge, real-time voice interaction platform that combines the power of AI-driven conversation management with high-quality audio/video communication. Built as a modern TypeScript monorepo, it showcases best practices in full-stack development, real-time communication, and AI integration.

### ✨ Key Features

- 🎙️ **Real-time Voice Chat** - High-quality audio communication powered by LiveKit
- 🤖 **Real Mastra Agents** - Intelligent AI agents with entity extraction and conversation capabilities
- 🧠 **Persistent Memory** - Long-term memory management with Mem0 integration for context-aware conversations
- 🔄 **Real-time Sync** - WebSocket-based live updates via Socket.IO
- 🎨 **Modern UI** - Beautiful, responsive interface built with React & Tailwind CSS
- 🏗️ **Monorepo Architecture** - Scalable workspace structure with Turbo
- 🔒 **Production Security** - Rate limiting, input validation, and CORS protection
- 📱 **Cross-Platform** - Works seamlessly across desktop and mobile devices

## 🏗️ Architecture

```
voice-agent-mastra-demo/
├── packages/
│   ├── shared/           # 📦 Shared types, utilities, and validation schemas
│   ├── backend/          # 🖥️ Express.js API with LiveKit, Socket.IO, and AI integration
│   └── frontend/         # 🎨 React frontend with real-time voice capabilities
├── docs/                 # 📚 Documentation and guides
└── scripts/             # 🔧 Development and deployment scripts
```

### 🛠️ Tech Stack

#### Frontend
- **React 18.3.1** - Modern UI library with hooks and concurrent features
- **TypeScript 5.8.3** - Type-safe development
- **Vite 6.0.7** - Lightning-fast build tool and dev server
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **LiveKit Client 2.15.3** - Real-time audio/video communication
- **Socket.IO Client 4.8.1** - Real-time bidirectional communication

#### Backend
- **Node.js 20.19.4 LTS** - JavaScript runtime
- **Express.js 4.21.2** - Web application framework
- **LiveKit Server SDK 2.8.2** - Audio/video infrastructure
- **Socket.IO 4.8.1** - Real-time communication
- **Pino 9.5.0** - High-performance logging
- **Zod 3.24.1** - Runtime type validation

#### DevOps & Tools
- **Turbo 2.5.5** - Monorepo build system with caching
- **pnpm 9.15.0** - Fast, disk space efficient package manager
- **ESLint 9.18.0** - Code quality and consistency
- **Prettier** - Code formatting
- **GitHub Actions** - CI/CD pipeline

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** >= 20.19.4 ([Download](https://nodejs.org/))
- **pnpm** >= 9.0.0 ([Install Guide](https://pnpm.io/installation))
- **Git** ([Download](https://git-scm.com/downloads))

### 1. Clone the Repository

```bash
git clone https://github.com/DealExMachina/voice-agent-mastra-demo.git
cd voice-agent-mastra-demo
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Setup

Create environment files from templates:

```bash
cp env.example .env
```

Configure your environment variables:

```bash
# Backend Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
FRONTEND_URL=http://localhost:3000

# LiveKit Configuration (Required)
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here
LIVEKIT_URL=wss://your-livekit-server.com

# AI Configuration (Required for AI features)
# Choose one AI provider:
OPENAI_API_KEY=your_openai_api_key_here         # Get from https://platform.openai.com/api-keys
# OR
ANTHROPIC_API_KEY=your_anthropic_api_key_here   # Get from https://console.anthropic.com/

# Memory Management (Required for persistent memory)
MEM0_API_KEY=your_mem0_api_key_here             # Get from https://app.mem0.ai/
MEM0_DATABASE_URL=your_mem0_database_url_here

# Optional: Advanced Mastra Configuration
MASTRA_API_KEY=your_mastra_api_key_here
MASTRA_MODEL=your_mastra_model_here
```

> **⚠️ Important**: You must configure LiveKit credentials for the application to work. Sign up at [LiveKit Cloud](https://cloud.livekit.io/) or [self-host LiveKit](https://docs.livekit.io/home/self-hosting/deployment/).

### 4. Start Development

```bash
# Start all services in development mode
pnpm dev
```

This will start:
- 🎨 Frontend at http://localhost:3000
- 🖥️ Backend at http://localhost:3001
- 📦 Shared package in watch mode

### 5. Build for Production

```bash
# Build all packages
pnpm build

# Preview production build
pnpm preview
```

## 📖 Documentation

### API Endpoints

#### Health Check
```http
GET /health
```
Returns server status and version information.

#### Session Management
```http
POST /api/sessions
Content-Type: application/json

{
  "userId": "string"
}
```

#### LiveKit Token Generation
```http
POST /api/livekit/token
Content-Type: application/json

{
  "roomName": "string",
  "participantName": "string"
}
```

#### Message Handling
```http
POST /api/messages
Content-Type: application/json

{
  "id": "string",
  "content": "string",
  "timestamp": "Date",
  "userId": "string",
  "sessionId": "string",
  "type": "user"
}
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Backend server port | No | `3001` |
| `NODE_ENV` | Environment mode | No | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | No | `http://localhost:3000` |
| `LIVEKIT_API_KEY` | LiveKit API key | **Yes** | - |
| `LIVEKIT_API_SECRET` | LiveKit API secret | **Yes** | - |
| `LIVEKIT_URL` | LiveKit server URL | No | `ws://localhost:7880` |
| `LOG_LEVEL` | Logging level | No | `info` |

### Development Commands

```bash
# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm type-check

# Clean build artifacts
pnpm clean
```

## 🔧 Configuration

### LiveKit Setup

1. **Cloud Option** (Recommended for development):
   - Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
   - Create a new project
   - Copy API key and secret to your `.env` file

2. **Self-Hosted Option**:
   - Follow the [LiveKit deployment guide](https://docs.livekit.io/home/self-hosting/deployment/)
   - Configure your server URL in `LIVEKIT_URL`

### Customization

#### Adding New Routes
1. Define route in `packages/backend/src/index.ts`
2. Add corresponding types in `packages/shared/src/index.ts`
3. Update frontend components in `packages/frontend/src/`

#### Styling
- Customize themes in `packages/frontend/tailwind.config.js`
- Add global styles in `packages/frontend/src/index.css`

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## 📦 Deployment

### Docker

```bash
# Build Docker image
docker build -t voice-agent-mastra-demo .

# Run container
docker run -p 3000:3000 -p 3001:3001 voice-agent-mastra-demo
```

### Vercel (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Railway/Render (Backend)

1. Connect your GitHub repository
2. Set environment variables
3. Deploy with build command: `pnpm build`
4. Start command: `pnpm start`

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pnpm test`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Ensure all tests pass
- Format code with Prettier

## 🐛 Troubleshooting

### Common Issues

**LiveKit Connection Failed**
- Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are set correctly
- Check `LIVEKIT_URL` points to a valid LiveKit server
- Ensure firewall allows WebSocket connections

**Port Already in Use**
- Change `PORT` in `.env` file
- Kill existing processes: `pkill -f "node"`

**Build Failures**
- Clear cache: `pnpm clean`
- Reinstall dependencies: `rm -rf node_modules && pnpm install`
- Check Node.js version: `node --version` (should be >= 20.19.4)

### Getting Help

- 📖 Check our [FAQ](docs/FAQ.md)
- 🐛 [Report issues](https://github.com/DealExMachina/voice-agent-mastra-demo/issues)
- 💬 [Join discussions](https://github.com/DealExMachina/voice-agent-mastra-demo/discussions)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

Special thanks to the amazing teams and projects that made this possible:

- **[LiveKit](https://livekit.io/)** - For providing excellent real-time communication infrastructure
- **[Mastra](https://mastra.ai/)** - For AI agent orchestration capabilities
- **[mem0](https://mem0.ai/)** - For intelligent memory management
- **[Vercel](https://vercel.com/)** - For the incredible Turbo monorepo tools
- **[Tailwind CSS](https://tailwindcss.com/)** - For the beautiful, utility-first styling
- **[React Team](https://react.dev/)** - For the powerful UI library
- **[TypeScript Team](https://www.typescriptlang.org/)** - For type safety and developer experience

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/DealExMachina/voice-agent-mastra-demo?style=social)
![GitHub forks](https://img.shields.io/github/forks/DealExMachina/voice-agent-mastra-demo?style=social)
![GitHub issues](https://img.shields.io/github/issues/DealExMachina/voice-agent-mastra-demo)
![GitHub pull requests](https://img.shields.io/github/issues-pr/DealExMachina/voice-agent-mastra-demo)

---

<div align="center">

**Built with ❤️ by the DealExMachina Team**

[Website](https://dealexmachina.com) • [Twitter](https://twitter.com/dealexmachina) • [LinkedIn](https://linkedin.com/company/dealexmachina)

</div> 