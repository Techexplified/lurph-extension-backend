import "dotenv/config";
import cors from "cors";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import passport, { configureGooglePassport } from "./config/passport.js";
import helmet from "helmet";
import mongoose from "mongoose";
import { connectDatabase } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

let oauthSessionStore;
let localServer;

function validateEnvironment() {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is missing. Add it to your environment variables.",
    );
  }
  if (
    !process.env.ACCESS_TOKEN_SECRET ||
    process.env.ACCESS_TOKEN_SECRET.length < 32
  ) {
    throw new Error(
      "ACCESS_TOKEN_SECRET must be set to a secret of at least 32 characters.",
    );
  }
  if (
    process.env.OAUTH_SESSION_SECRET &&
    process.env.OAUTH_SESSION_SECRET.length < 32
  ) {
    throw new Error(
      "OAUTH_SESSION_SECRET must be at least 32 characters when provided.",
    );
  }
  const refreshDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30);
  if (!Number.isInteger(refreshDays) || refreshDays < 1 || refreshDays > 365) {
    throw new Error(
      "REFRESH_TOKEN_TTL_DAYS must be an integer between 1 and 365.",
    );
  }
}

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      // Requests from curl/Postman have no Origin header. Browser origins must be allow-listed.
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);
app.use(express.json({ limit: "10kb" }));

app.get("/", (_req, res) => {
  return res.status(200).json({ message: "Lurph backend server is running." });
});

app.get("/api/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  return res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    database: connected ? "connected" : "disconnected",
  });
});

// Vercel requires the Express application to be exported. Complete asynchronous
// initialization before exporting it so routes are mounted before requests arrive.
async function initializeApp() {
  validateEnvironment();
  await connectDatabase();

  oauthSessionStore = MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: "lurph_oauth_sessions",
    ttl: 10 * 60,
    autoRemove: "native",
  });

  app.use(
    session({
      name: "lurph.oauth.sid",
      secret:
        process.env.OAUTH_SESSION_SECRET || process.env.ACCESS_TOKEN_SECRET,
      store: oauthSessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 10 * 60 * 1000,
      },
    }),
  );

  app.use(passport.initialize());
  configureGooglePassport();
  app.use("/api/auth", authRoutes);
  app.use(notFound);
  app.use(errorHandler);
}

await initializeApp();

// Vercel handles the HTTP listener. When running locally with `npm run dev` or
// `npm start`, start a listener so the same Express app is available on PORT.
if (!process.env.VERCEL) {
  localServer = app.listen(port, () => {
    console.log(`Lurph API running at http://localhost:${port}`);
  });

  async function shutDown(signal) {
    console.log(`${signal} received. Shutting down Lurph API...`);
    if (localServer) await new Promise((resolve) => localServer.close(resolve));
    if (oauthSessionStore) await oauthSessionStore.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  process.on("SIGINT", () => void shutDown("SIGINT"));
  process.on("SIGTERM", () => void shutDown("SIGTERM"));
}

export default app;
