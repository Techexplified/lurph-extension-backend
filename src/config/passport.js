import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { findOrCreateGoogleUser } from "../services/googleUser.js";

let googleStrategyConfigured = false;

/**
 * Configure  Passport's Google OAuth 2.0 authorization-code strategy.
 * This is called after dotenv has loaded and the server has connected to MongoDB.
 */
export function configureGooglePassport() {
  const clientID = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const callbackURL = process.env.GOOGLE_CALLBACK_URL?.trim();

  if (!clientID || !clientSecret || !callbackURL) {
    googleStrategyConfigured = false;
    return false;
  }

  passport.use(
    "google",
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ["profile", "email"],
        // Passport stores and verifies this nonce in the temporary Express session.
        state: true,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateGoogleUser(profile);
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  googleStrategyConfigured = true;
  return true;
}

export function isGoogleOAuthConfigured() {
  if (!googleStrategyConfigured) return false;

  const extensionRedirect = process.env.GOOGLE_EXTENSION_REDIRECT_URL?.trim();
  if (!extensionRedirect) return false;

  try {
    const parsed = new URL(extensionRedirect);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(".chromiumapp.org")
    );
  } catch {
    return false;
  }
}

export default passport;
