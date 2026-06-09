# Task Completion

Checklist for validating changes and ensuring tasks are complete.

## Verification Checklist

### Frontend Checklist
- Run frontend linter: `npm run lint` in `005-frontend` to verify no new linting errors are introduced.
- Run frontend build: `npm run build` in `005-frontend` to ensure correct TypeScript/JavaScript compilation and bundler compatibility.
- Ensure any clipboard interactions use the `copyToClipboard` utility function from `src/utils/clipboard.js`.

### Backend Checklist
- Check migrations if database schema changed.
- Verify environment variables are documented in `.env.example`.
