const User = require("../../models/User");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");
const {
    clean,
    validateStrongPassword,
    validateRole,
    validateLanguage
} = require("../../utils/validation");

const MAX_CHANGE_PASSWORD_ATTEMPTS = 3;
const CHANGE_PASSWORD_LOCK_MS = 30 * 60 * 1000;

const removeOldProfileImage = (imageName) => {
    if (!imageName || imageName.includes("default")) {
        return;
    }

    const fileName = path.basename(imageName);
    const imagePath = `uploads/profiles/${fileName}`;

    if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
    }
};

const getChangePasswordBlockState = async (userId) => {
    const user = await User.findById(userId).select("changePasswordAttempts changePasswordLockUntil");

    if (!user) {
        return {
            user: null,
            isBlocked: false,
            remainingSeconds: 0,
            attempts: 0,
            attemptsLeft: MAX_CHANGE_PASSWORD_ATTEMPTS
        };
    }

    const lockTime = user.changePasswordLockUntil ? user.changePasswordLockUntil.getTime() : 0;
    const remainingMs = lockTime - Date.now();

    if (remainingMs > 0) {
        return {
            user,
            isBlocked: true,
            remainingSeconds: parseInt(remainingMs / 1000) + 1,
            attempts: user.changePasswordAttempts || 0,
            attemptsLeft: 0
        };
    }

    if (user.changePasswordLockUntil && remainingMs <= 0) {
        user.changePasswordAttempts = 0;
        user.changePasswordLockUntil = null;
        await user.save();
    }

    const attempts = user.changePasswordAttempts || 0;

    return {
        user,
        isBlocked: false,
        remainingSeconds: 0,
        attempts,
        attemptsLeft: Math.max(MAX_CHANGE_PASSWORD_ATTEMPTS - attempts, 0)
    };
};

const renderChangePassword = async (req, res, data = {}) => {
    const blockState = await getChangePasswordBlockState(req.user._id);

    if (!blockState.user) {
        return res.redirect("/logout");
    }

    return res.render("profile/changePassword", {
        success: data.success || null,
        error: data.error || null,
        isChangePasswordBlocked: blockState.isBlocked,
        remainingSeconds: blockState.remainingSeconds,
        attemptsLeft: typeof data.attemptsLeft === "number" ? data.attemptsLeft : blockState.attemptsLeft,
        maxChangePasswordAttempts: MAX_CHANGE_PASSWORD_ATTEMPTS
    });
};

const profilePage = (req, res) => {
    res.render("profile/profile", {
        success: req.query.success ? "Profile updated successfully." : null,
        error: null
    });
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;

        const profileData = {
            username: clean(req.body.username),
            role: clean(req.body.role),
            country: clean(req.body.country),
            languages: clean(req.body.languages),
            contact: clean(req.body.contact),
            backendDeveloper: clean(req.body.backendDeveloper),
            location: clean(req.body.location),
            dateOfBirth: clean(req.body.dateOfBirth),
            githubUsername: clean(req.body.githubUsername),
            linkedinUrl: clean(req.body.linkedinUrl),
            instagramUrl: clean(req.body.instagramUrl),
            twitterUrl: clean(req.body.twitterUrl)
        };

        if (!profileData.username) {
            return res.render("profile/profile", {
                success: null,
                error: "Name is required."
            });
        }

        if (!validateRole(profileData.role)) {
            return res.render("profile/profile", {
                success: null,
                error: "Please select a valid role."
            });
        }

        if (!validateLanguage(profileData.languages)) {
            return res.render("profile/profile", {
                success: null,
                error: "Please select a valid language."
            });
        }

        const oldUser = await User.findById(userId);

        if (!oldUser) {
            return res.redirect("/logout");
        }

        if (req.file) {
            profileData.profileImage = req.file.path.replace(/\\/g, "/").replace("uploads/", "");
            removeOldProfileImage(oldUser.profileImage);
        }

        const updatedUser = await User.findByIdAndUpdate(userId, profileData,
            { returnDocument: "after", runValidators: true }
        );

        req.login(updatedUser, (loginErr) => {
            if (loginErr) {
                return res.render("profile/profile", {
                    success: null,
                    error: "Profile updated, but session refresh failed. Please login again."
                });
            }

            return res.redirect("/profile?success=1");
        });
    } catch (error) {
        console.error(error);
        return res.render("profile/profile", {
            success: null,
            error: "Profile update failed. Please try again."
        });
    }
};

const changePasswordPage = async (req, res) => {
    return renderChangePassword(req, res);
};

const changePassword = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const blockState = await getChangePasswordBlockState(userId);

        if (!blockState.user) {
            return res.redirect("/logout");
        }

        if (blockState.isBlocked) {
            return res.status(429).render("profile/changePassword", {
                success: null,
                error: "Too many incorrect attempts. Please try again later.",
                isChangePasswordBlocked: true,
                remainingSeconds: blockState.remainingSeconds,
                attemptsLeft: 0,
                maxChangePasswordAttempts: MAX_CHANGE_PASSWORD_ATTEMPTS
            });
        }
        const oldPassword = clean(req.body.oldPassword);
        const newPassword = clean(req.body.newPassword);
        const confirmPassword = clean(req.body.confirmPassword);

        if (!oldPassword || !newPassword || !confirmPassword) {
            return renderChangePassword(req, res, {
                error: "Please fill old password, new password and confirm password."
            });
        }

        const passwordError = validateStrongPassword(newPassword);
        if (passwordError) {
            return renderChangePassword(req, res, {
                error: passwordError
            });
        }

        if (newPassword !== confirmPassword) {
            return renderChangePassword(req, res, {
                error: "New password and confirm password do not match."
            });
        }

        if (oldPassword === newPassword) {
            return renderChangePassword(req, res, {
                error: "New password cannot be the same as old password."
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.redirect("/logout");
        }

        const isOldPasswordRight = await bcrypt.compare(oldPassword, user.password);

        if (!isOldPasswordRight) {
            user.changePasswordAttempts = (user.changePasswordAttempts || 0) + 1;

            if (user.changePasswordAttempts >= MAX_CHANGE_PASSWORD_ATTEMPTS) {
                user.changePasswordAttempts = MAX_CHANGE_PASSWORD_ATTEMPTS;
                user.changePasswordLockUntil = new Date(Date.now() + CHANGE_PASSWORD_LOCK_MS);
                await user.save();

                return res.status(429).render("profile/changePassword", {
                    success: null,
                    error: "Too many incorrect attempts. Change password is disabled for 30 minutes.",
                    isChangePasswordBlocked: true,
                    remainingSeconds: parseInt(CHANGE_PASSWORD_LOCK_MS / 1000),
                    attemptsLeft: 0,
                    maxChangePasswordAttempts: MAX_CHANGE_PASSWORD_ATTEMPTS
                });
            }

            await user.save();
            const attemptsLeft = MAX_CHANGE_PASSWORD_ATTEMPTS - user.changePasswordAttempts;

            return renderChangePassword(req, res, {
                error: `Old password is incorrect. ${attemptsLeft} attempt(s) left.`,
                attemptsLeft
            });
        }

        const hashPassword = await bcrypt.hash(newPassword, 12);

        user.password = hashPassword;
        user.changePasswordAttempts = 0;
        user.changePasswordLockUntil = null;

        await user.save();

        req.logout((logoutErr) => {
            if (logoutErr) {
                return next(logoutErr);
            }

            req.session.destroy((sessionErr) => {
                if (sessionErr) {
                    return next(sessionErr);
                }

                res.clearCookie("connect.sid");
                res.clearCookie("sessionId");
                return res.redirect("/login?passwordChanged=1");
            });
        });
    } catch (error) {
        console.error(error);
        return renderChangePassword(req, res, {
            error: "Password update failed. Please try again."
        });
    }
};

module.exports = {
    profilePage,
    updateProfile,
    changePasswordPage,
    changePassword
};
