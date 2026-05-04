# Agent Guidelines for `stream-server`

This document provides essential context for AI agents working in this repository to ensure efficient and accurate operations.

## Project Overview
-   **Type**: Node.js backend server.
-   **Purpose**: Real-time server integrating Twitch, GitHub, and VSCode via WebSockets for stream overlays.
-   **Language**: JavaScript (CommonJS).

## Key Developer Commands
-   **Start Server**: `npm start` (runs `node backend/server.js`)

## Architecture Notes
-   **Main Entry Point**: `backend/server.js`
-   **Core Modules**: The `backend/` directory contains modules organized by concern, including `webhook`, `websocket`, `twitch`, `routes`, `eventsub`, `followers`, `kick`, and `config`.
-   **Dependencies**: Uses `express` for the web server, `ws` for WebSocket communication, `dotenv` for environment variable management, and `body-parser` for parsing request bodies.

## Testing
-   **No Automated Tests**: The `package.json` explicitly states "Error: no test specified" for the `test` script. Agents should assume no automated test suite is available.

## Environment & Configuration
-   **Environment Variables**: Uses `dotenv`, implying configuration relies on `.env` files. Ensure these are properly managed and never committed to version control.
