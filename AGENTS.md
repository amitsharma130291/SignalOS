# SIGNALOS Engineering Workflow

## Responsibilities

Human (Architect):
- architecture
- schema design
- system decisions
- debugging strategy
- safety/reliability guidance
- product direction
- outbound strategy

Cursor AI:
- implementation
- Prisma migrations
- repetitive code
- test writing
- refactors
- boilerplate
- file generation

## Development Philosophy

Build lean MVP systems.

Optimize for:
- qualified conversations
- safe outbound
- operational simplicity
- reliability
- learning velocity

Avoid:
- premature scaling
- over-engineering
- unnecessary abstractions
- AI agent complexity
- infrastructure bloat

## Engineering Rules

- Strict TDD
- Tests first
- Show terminal output
- Prisma is source of truth
- Human review required for outbound
- Safety defaults must remain enabled

## MVP Constraints

Do NOT add unless explicitly requested:
- Redis
- BullMQ
- vector databases
- microservices
- advanced analytics
- AI agents
- multi-channel outreach
- event sourcing

## Code Quality

Prefer:
- simple code
- readable code
- explicit types
- small files
- safe defaults

Avoid:
- clever abstractions
- giant service layers
- unnecessary patterns