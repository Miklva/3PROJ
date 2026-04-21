const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { query } = require('./database');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'google-id-placeholder',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'google-secret-placeholder',
    callbackURL: "/api/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      const googleId = profile.id;

      // Chercher l'utilisateur par google_id ou email
      let users = await query('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email]);
      
      if (users.length > 0) {
        const user = users[0];
        // Si l'utilisateur existe par email mais n'a pas de google_id, on le lie
        if (!user.google_id) {
          await query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
          user.google_id = googleId;
        }
        return done(null, user);
      }

      // Créer un nouvel utilisateur si n'existe pas
      const username = profile.displayName || profile.username || email.split('@')[0];
      const avatar_url = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      const result = await query(
        'INSERT INTO users (username, email, google_id, avatar_url) VALUES (?, ?, ?, ?)',
        [username, email, googleId, avatar_url]
      );

      const newUser = {
        id: result.insertId,
        username,
        email,
        google_id: googleId,
        avatar_url
      };

      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }
));

passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || 'github-id-placeholder',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'github-secret-placeholder',
    callbackURL: "/api/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.com`;
      const githubId = profile.id;

      let users = await query('SELECT * FROM users WHERE github_id = ? OR email = ?', [githubId, email]);

      if (users.length > 0) {
        const user = users[0];
        if (!user.github_id) {
          await query('UPDATE users SET github_id = ? WHERE id = ?', [githubId, user.id]);
          user.github_id = githubId;
        }
        return done(null, user);
      }

      const username = profile.username || profile.displayName || email.split('@')[0];
      const avatar_url = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

      const result = await query(
        'INSERT INTO users (username, email, github_id, avatar_url) VALUES (?, ?, ?, ?)',
        [username, email, githubId, avatar_url]
      );

      const newUser = {
        id: result.insertId,
        username,
        email,
        github_id: githubId,
        avatar_url
      };

      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Pas besoin de session avec JWT, mais passport en a besoin pour l'init
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
