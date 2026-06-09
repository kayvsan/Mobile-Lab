# Core Map and Project Invariants

Top-level entrypoint for the Mobile-Lab APM project codebase.

## Directory Structure
- `003-modular-apm`: Core mobile APM testing / network verification runner (Python).
- `004-backend`: Flask API backend storing execution data and reports.
- `005-frontend`: React (Vite, TailwindCSS) dashboard.
- `006-agent`: Mobile automation execution daemon running on the remote device server (Python).
- `nginx`: Configuration for reverse proxy / static asset serving.
- `ws-scrcpy`: Web-socket scrcpy translation layer.

## Invariants
- Frontend communicates with Backend using axios api service.
- Agent registers to Backend with an API key, communicating status and retrieving automation tasks.
- Postgres stores execution state, agent listings, and user information.

## Related Memories
- Tech Stack details: `mem:tech_stack`
- Suggested dev and deployment commands: `mem:suggested_commands`
- Codebase guidelines & styles: `mem:conventions`
- Task checklist and validation: `mem:task_completion`
