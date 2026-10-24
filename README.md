# Lurph Backend (Starter)

A minimal Express server with a MongoDB connection. Authentication and other API features have not been added.

## Requirements

- Node.js 20 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and set `MONGODB_URI` to your MongoDB connection string.

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Start the server in development mode:

   ```bash
   npm run dev
   ```

   Or start normally:

   ```bash
   npm start
   ```

The server connects to MongoDB before listening on the configured port. Open `http://localhost:4000/` to check the basic response (or use the port configured in `.env`).
