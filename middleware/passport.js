const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { clean, normalizeEmail, validateGmail } = require("../utils/validation");

passport.use(new LocalStrategy(
    {
        usernameField: "email"
    },
    async (email, password, done) => {
        try {
            const normalizedEmail = normalizeEmail(email);
            const cleanPassword = clean(password);

            if (!normalizedEmail || !cleanPassword) {
                return done(null, false, {
                    message: "Email and password are required."
                });
            }

            const emailError = validateGmail(email);
            if (emailError) {
                return done(null, false, {
                    message: emailError
                });
            }

            const user = await User.findOne({ email: normalizedEmail });

            if (!user) {
                return done(null, false, {
                    message: "Email not found."
                });
            }

            const isMatch = await bcrypt.compare(cleanPassword, user.password);

            if (!isMatch) {
                return done(null, false, {
                    message: "Incorrect password."
                });
            }

            return done(null, user);

        } catch (err) {
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    return done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

module.exports = passport;
