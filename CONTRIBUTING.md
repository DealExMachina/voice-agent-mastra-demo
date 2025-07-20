# Contributing to Voice Agent Mastra Demo

First off, thank you for considering contributing to Voice Agent Mastra Demo! 🎉

It's people like you that make Voice Agent Mastra Demo such a great tool. We welcome contributions from everyone, regardless of their experience level.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Documentation](#documentation)
- [Getting Help](#getting-help)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to [conduct@dealexmachina.com](mailto:conduct@dealexmachina.com).

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 20.19.4 LTS ([Download](https://nodejs.org/))
- **pnpm** >= 9.0.0 ([Install Guide](https://pnpm.io/installation))
- **Git** ([Download](https://git-scm.com/downloads))

### Setting up your development environment

1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/voice-agent-mastra-demo.git
   cd voice-agent-mastra-demo
   ```

2. **Add the upstream remote**
   ```bash
   git remote add upstream https://github.com/DealExMachina/voice-agent-mastra-demo.git
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your LiveKit credentials
   ```

5. **Start development**
   ```bash
   pnpm dev
   ```

6. **Verify everything works**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001/health

## 🔄 Development Workflow

### Branch Naming Convention

Use descriptive branch names with the following format:

```
<type>/<short-description>

Examples:
feature/add-user-authentication
bugfix/fix-livekit-connection
docs/update-api-documentation
refactor/improve-error-handling
```

### Working on Issues

1. **Check existing issues** before starting work
2. **Comment on the issue** to let others know you're working on it
3. **Keep your branch updated** with the latest main branch
4. **Test your changes** thoroughly before submitting

### Keeping Your Fork Updated

```bash
# Fetch the latest changes from upstream
git fetch upstream

# Switch to your main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Push to your fork
git push origin main
```

## 💻 Coding Standards

### TypeScript Guidelines

- **Use strict TypeScript** - Enable all strict compiler options
- **Explicit types** for function parameters and return values
- **Avoid `any`** - Use proper typing or `unknown` with type guards
- **Use interfaces** for object shapes, `type` for unions/intersections
- **Prefer `const` assertions** for immutable data

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email: string;
}

const createUser = (userData: Partial<User>): User => {
  return {
    id: generateId(),
    ...userData,
  } as User;
};

// ❌ Bad
const createUser = (userData: any): any => {
  return {
    id: generateId(),
    ...userData,
  };
};
```

### React Guidelines

- **Use functional components** with hooks
- **Custom hooks** for reusable logic
- **Proper dependency arrays** in useEffect
- **Memoization** for expensive calculations or object references

```tsx
// ✅ Good
const VoiceAgent: React.FC = () => {
  const [state, setState] = useState<VoiceAgentState>(initialState);
  
  const updateState = useCallback((updates: Partial<VoiceAgentState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  return <div>...</div>;
};

// ❌ Bad
const VoiceAgent = () => {
  const [state, setState] = useState({});
  
  useEffect(() => {
    initializeSession();
  }, []); // Missing dependency

  return <div>...</div>;
};
```

### CSS/Styling Guidelines

- **Use Tailwind CSS** utility classes
- **Component-scoped styles** when necessary
- **Responsive design** with mobile-first approach
- **Consistent spacing** using Tailwind's spacing scale

```tsx
// ✅ Good
<button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
  Submit
</button>

// ❌ Bad
<button style={{ backgroundColor: 'blue', padding: '8px 16px' }}>
  Submit
</button>
```

### File Naming Conventions

- **PascalCase** for React components: `VoiceAgent.tsx`
- **camelCase** for utilities: `apiClient.ts`
- **kebab-case** for directories: `voice-agent/`
- **UPPERCASE** for constants: `API_ENDPOINTS.ts`

### Import Organization

```typescript
// 1. Node modules
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

// 2. Internal modules (relative imports)
import { VoiceMessage } from '@voice-agent-mastra-demo/shared';

// 3. Local imports
import VoiceAgent from './components/VoiceAgent';
import { apiClient } from '../utils/apiClient';
```

## 🧪 Testing Guidelines

### Writing Tests

We use **Vitest** for testing. Tests should be:

- **Descriptive** - Clear test names explaining what is being tested
- **Isolated** - Each test should be independent
- **Fast** - Unit tests should run quickly
- **Reliable** - Tests should not be flaky

```typescript
// ✅ Good test
describe('VoiceMessage validation', () => {
  it('should validate a valid voice message', () => {
    const validMessage = {
      id: '123',
      content: 'Hello',
      timestamp: new Date(),
      userId: 'user123',
      sessionId: 'session123',
      type: 'user' as const,
    };

    const result = safeParseVoiceMessage(validMessage);
    expect(result.success).toBe(true);
  });

  it('should reject message with missing required fields', () => {
    const invalidMessage = {
      content: 'Hello',
    };

    const result = safeParseVoiceMessage(invalidMessage);
    expect(result.success).toBe(false);
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests for specific package
pnpm --filter @voice-agent-mastra-demo/shared test
```

## 📝 Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools

### Examples

```bash
# Good commit messages
feat(backend): add rate limiting to API endpoints
fix(frontend): resolve LiveKit connection timeout issue
docs: update API documentation with new endpoints
refactor(shared): improve type definitions for better type safety
test(backend): add unit tests for session management

# Bad commit messages
fix stuff
update code
changes
```

## 📥 Pull Request Process

### Before Submitting

1. **Ensure your code follows our coding standards**
2. **Run the full test suite**: `pnpm test`
3. **Run linting**: `pnpm lint`
4. **Check types**: `pnpm type-check`
5. **Test the build**: `pnpm build`
6. **Update documentation** if needed

### PR Template

When creating a pull request, please include:

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots to help explain your changes

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

### Review Process

1. **Automated checks** must pass (linting, tests, build)
2. **At least one maintainer** must approve the PR
3. **Address feedback** promptly and professionally
4. **Squash and merge** is preferred to keep history clean

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the FAQ** and documentation
3. **Try to reproduce** the issue with minimal steps

### Bug Reports

Include the following information:

```markdown
## Bug Description
A clear and concise description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
A clear and concise description of what you expected to happen.

## Actual Behavior
A clear and concise description of what actually happened.

## Environment
- OS: [e.g. macOS, Windows, Linux]
- Node.js version: [e.g. 20.19.4]
- Browser: [e.g. Chrome, Firefox, Safari]
- Package version: [e.g. 1.0.0]

## Additional Context
Add any other context about the problem here.
```

### Feature Requests

```markdown
## Feature Description
A clear and concise description of what you want to happen.

## Use Case
Describe the use case and why this feature would be valuable.

## Proposed Solution
A clear and concise description of what you want to happen.

## Alternatives Considered
A clear and concise description of any alternative solutions or features you've considered.

## Additional Context
Add any other context or screenshots about the feature request here.
```

## 📚 Documentation

### Documentation Standards

- **Clear and concise** language
- **Code examples** for complex features
- **Up-to-date** with the current codebase
- **Well-structured** with proper headings

### Types of Documentation

1. **README.md** - Project overview and quick start
2. **API Documentation** - Endpoint specifications
3. **Code Comments** - Inline documentation for complex logic
4. **Examples** - Working code examples
5. **Guides** - Step-by-step tutorials

### JSDoc Comments

```typescript
/**
 * Creates a new voice message with validation
 * @param content - The message content
 * @param userId - The user who sent the message
 * @param sessionId - The session ID for the message
 * @returns The created voice message
 * @throws {ValidationError} When message content is invalid
 */
function createVoiceMessage(
  content: string,
  userId: string,
  sessionId: string
): VoiceMessage {
  // Implementation
}
```

## 🆘 Getting Help

### Where to Ask Questions

1. **GitHub Discussions** - For general questions and discussions
2. **GitHub Issues** - For bug reports and feature requests
3. **Discord** - For real-time chat (link in README)
4. **Email** - For security issues: security@dealexmachina.com

### When Asking for Help

1. **Provide context** - What are you trying to achieve?
2. **Include relevant code** - Minimal reproducible example
3. **Describe what you've tried** - Show your research effort
4. **Be specific** - Vague questions get vague answers

## 🏆 Recognition

Contributors who make significant contributions will be:

- Added to the [Contributors section](README.md#contributors)
- Mentioned in release notes
- Invited to join the core team (for exceptional contributors)

## 📄 License

By contributing to Voice Agent Mastra Demo, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉

If you have any questions about contributing, please don't hesitate to ask in our [GitHub Discussions](https://github.com/DealExMachina/voice-agent-mastra-demo/discussions). 