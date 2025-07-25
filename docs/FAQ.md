# Frequently Asked Questions (FAQ)

## General Questions

### What is Voice Agent Mastra Demo?

Voice Agent Mastra Demo is a modern, production-ready voice interaction platform that combines AI-driven conversation management with high-quality real-time audio/video communication. It's built as a TypeScript monorepo showcasing best practices in full-stack development.

### What technologies does it use?

The project uses a modern tech stack including:
- **Frontend**: React 18.3.1, TypeScript 5.8.3, Vite 6.0.7, Tailwind CSS
- **Backend**: Node.js 20.19.4, Express.js, LiveKit SDK, Socket.IO
- **Build System**: Turbo 2.5.5, pnpm 9.15.0
- **AI Integration**: Ready for Mastra and mem0 integration

### Is this suitable for production use?

Yes! The codebase includes production-ready features like:
- Rate limiting and security headers
- Structured logging and error handling
- Input validation and type safety
- Scalable monorepo architecture
- Modern build system with caching

## Setup and Installation

### Why do I need LiveKit credentials?

LiveKit provides the real-time audio/video infrastructure. The application requires LiveKit API credentials to:
- Generate access tokens for users
- Create and manage voice rooms
- Handle real-time audio/video streams

You can get free credentials from [LiveKit Cloud](https://cloud.livekit.io/) or self-host LiveKit.

### How do I get LiveKit credentials?

1. **Cloud Option** (Recommended for development):
   - Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
   - Create a new project
   - Copy the API Key and Secret from your project dashboard
   - Add them to your `.env` file

2. **Self-Hosted Option**:
   - Follow the [LiveKit deployment guide](https://docs.livekit.io/home/self-hosting/deployment/)
   - Configure your server URL in `LIVEKIT_URL`

### What Node.js version should I use?

Use Node.js **20.19.4 LTS** or later. This is the latest Long Term Support version and provides the best stability and performance.

### Can I use npm or yarn instead of pnpm?

While technically possible, we strongly recommend pnpm because:
- The project is configured for pnpm workspaces
- pnpm is faster and more disk-efficient
- All scripts and documentation assume pnpm
- Turbo is optimized for pnpm

## Development Issues

### The backend fails to start with "Missing required environment variables"

This happens when LiveKit credentials are not configured. To fix:

1. Copy the environment template:
   ```bash
   cp env.example .env
   ```

2. Edit `.env` and add your LiveKit credentials:
   ```bash
   LIVEKIT_API_KEY=your_actual_api_key
   LIVEKIT_API_SECRET=your_actual_api_secret
   ```

3. Restart the development server:
   ```bash
   pnpm dev
   ```

### Port 3000 or 3001 is already in use

Change the ports in your `.env` file:
```bash
PORT=3002  # Backend port
FRONTEND_URL=http://localhost:3001  # Update frontend URL accordingly
```

Or kill existing processes:
```bash
pkill -f "node"
pkill -f "vite"
```

### TypeScript errors about missing modules

This usually happens when dependencies aren't installed properly:

1. Clean install dependencies:
   ```bash
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

2. Rebuild shared packages:
   ```bash
   pnpm build
   ```

### LiveKit connection fails in the browser

Check the following:

1. **Credentials**: Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` are correct
2. **URL**: Ensure `LIVEKIT_URL` points to a valid LiveKit server
3. **Firewall**: Make sure WebSocket connections are allowed
4. **HTTPS**: LiveKit requires HTTPS in production (localhost is fine for development)

### Build fails with "Cannot find module" errors

This often indicates TypeScript project reference issues:

1. Build packages in order:
   ```bash
   pnpm clean
   pnpm --filter @voice-agent-mastra-demo/shared build
   pnpm build
   ```

2. Check TypeScript configuration:
   ```bash
   pnpm type-check
   ```

### Development server is slow or unresponsive

Try these optimizations:

1. **Clear Turbo cache**:
   ```bash
   pnpm clean
   ```

2. **Restart with fresh cache**:
   ```bash
   rm -rf .turbo
   pnpm dev
   ```

3. **Check system resources**: Ensure you have enough RAM and CPU available

## Features and Usage

### How do I add new API endpoints?

1. **Define the route** in `packages/backend/src/index.ts`:
   ```typescript
   app.get('/api/my-endpoint', (req, res) => {
     res.json({ message: 'Hello World' });
   });
   ```

2. **Add types** in `packages/shared/src/index.ts`:
   ```typescript
   export interface MyResponse {
     message: string;
   }
   ```

3. **Use in frontend** in `packages/frontend/src/`:
   ```typescript
   import { MyResponse } from '@voice-agent-mastra-demo/shared';
   
   const response = await fetch('/api/my-endpoint');
   const data: MyResponse = await response.json();
   ```

### How do I customize the UI theme?

Edit `packages/frontend/tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
    },
  },
};
```

### Can I add user authentication?

Yes! The architecture supports adding authentication. Recommended approach:

1. **Add auth middleware** to the backend
2. **Create auth context** in the frontend
3. **Protect routes** that require authentication
4. **Store tokens** securely (httpOnly cookies recommended)

### How do I deploy this to production?

See the [deployment section](../README.md#deployment) in the README. Popular options:

- **Frontend**: Vercel, Netlify, or any static hosting
- **Backend**: Railway, Render, or any Node.js hosting
- **Full-stack**: Docker containers on AWS, GCP, or Azure

## Troubleshooting

### Memory issues during build

If you encounter out-of-memory errors:

1. **Increase Node.js memory**:
   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   pnpm build
   ```

2. **Build packages individually**:
   ```bash
   pnpm --filter @voice-agent-mastra-demo/shared build
   pnpm --filter @voice-agent-mastra-demo/backend build
   pnpm --filter @voice-agent-mastra-demo/frontend build
   ```

### WebSocket connection issues

Common causes and solutions:

1. **Proxy/Firewall**: Ensure WebSocket connections are allowed
2. **CORS**: Check CORS configuration in backend
3. **URL Format**: Verify Socket.IO URL format is correct
4. **Development vs Production**: Different configurations may be needed

### Permission errors on macOS/Linux

If you get permission errors:

1. **Don't use sudo with pnpm**
2. **Fix npm permissions**:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   export PATH=~/.npm-global/bin:$PATH
   ```

3. **Use Node Version Manager**: Consider using nvm for Node.js management

## Contributing

### How can I contribute?

See our [Contributing Guide](../CONTRIBUTING.md) for detailed instructions. We welcome:

- Bug reports and fixes
- Feature requests and implementations
- Documentation improvements
- Code quality enhancements

### What's the development workflow?

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request
6. Address review feedback

### Where can I get help?

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Documentation**: Check README and guides first
- **Community**: Join our Discord (link in README)

## Still Need Help?

If you can't find the answer to your question:

1. **Search existing issues** on GitHub
2. **Check the documentation** in the `docs/` folder
3. **Ask in GitHub Discussions** for community help
4. **Create a new issue** if you found a bug

Remember to include:
- Your operating system
- Node.js version
- Error messages
- Steps to reproduce the issue

---

**Last updated**: January 20, 2025
**Version**: 1.0.0 