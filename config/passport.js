// config/passport.js
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import Users from '../models/userModel.js';
import { createJWT, createRefreshJWT } from '../middlewares/jwt.js';

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = `${process.env.API_URL}/v1/auth/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: googleClientID,
      clientSecret: googleClientSecret,
      callbackURL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile?.emails?.[0]?.value;
        if (!email) return done(new Error('Google profile has no email'), null);

        let user = await Users.findOne({ email });

        if (!user) {
          user = await Users.create({
            fullName: profile.displayName,
            email,
            profileUrl: profile?.photos?.[0]?.value,
            role: 'user',
            googleId: profile.id,
          });
        }

        const tokenUser = {
          _id: user._id,
          fullName: user.fullName,
          profileUrl: user.profileUrl,
          email: user.email,
          role: user.role,
        };

        const token = createJWT(tokenUser); // short-lived
        const refreshToken = createRefreshJWT(tokenUser); // long-lived

        user.refreshToken = refreshToken;
        await user.save();

        // Return only safe user fields
        const safeUser = {
          _id: user._id,
          fullName: user.fullName,
          email: user.email,
          profileUrl: user.profileUrl,
          role: user.role,
        };

        return done(null, { user: safeUser, token, refreshToken });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// Not using server sessions; only tokens
passport.serializeUser((payload, done) => done(null, payload));
passport.deserializeUser((payload, done) => done(null, payload));
