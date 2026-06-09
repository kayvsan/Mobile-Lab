# Conventions

Development standards and project-specific guidelines.

## Code Style & Conventions

### Frontend
- Component structure: Functional components with hooks.
- Styling: Use tailwind/vite config, keep custom CSS minimal. Avoid hardcoded styles where reusable tokens exist.
- API Client: Always use the centralized `api` axios service for communicating with the backend API.
- Clipboard Operations: ALWAYS use `copyToClipboard` helper from `src/utils/clipboard.js` instead of direct `navigator.clipboard` access to prevent TypeErrors in non-secure HTTP contexts or WebViews.
- Notifications: Use the custom toast hook `useToast` for error/success notifications.

### Python Backend & Agent
- DB connection strings should rely on environment variables (`.env`).
- Maintain modular services and routes.
- Implement robust exception handling and fallback options when interacting with external APIs or system ADB tools.
