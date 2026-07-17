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

const maxPasswordattept = 3;
const lockTime = 30 * 60 * 1000;

const removeOldProfileImage = (imageName) => {
    if (!imageName || imageName.includes("default")) {
        return;
    }

    const oldImagePath = `uploads/${imageName}`;

    if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
    }
};

const getChangePasswordBlockState = async (userId) => {
    const user = await User.findById(userId).select(
        "changePasswordAttempts changePasswordLockUntil"
    );

    if (!user) {
        return {
            user: null,
            isBlocked: false,
            remainingSeconds: 0,
            attempts: 0,
            attemptsLeft: maxPasswordattept
        };
    }

    let lockTime = 0;

    if (user.changePasswordLockUntil) {
        lockTime = user.changePasswordLockUntil.getTime();
    }

    const currentTime = Date.now();
    const remainingTime = lockTime - currentTime;

    if (remainingTime > 0) {
        const remainingSeconds = parseInt(remainingTime / 1000) + 1;

        return {
            user,
            isBlocked: true,
            remainingSeconds,
            attempts: user.changePasswordAttempts || 0,
            attemptsLeft: 0
        };
    }

    if (user.changePasswordLockUntil && remainingTime <= 0) {
        user.changePasswordAttempts = 0;
        user.changePasswordLockUntil = null;

        await user.save();
    }

    const attempts = user.changePasswordAttempts || 0;
    let attemptsLeft = maxPasswordattept - attempts;

    if (attemptsLeft < 0) {
        attemptsLeft = 0;
    }

    return {
        user,
        isBlocked: false,
        remainingSeconds: 0,
        attempts,
        attemptsLeft
    };
};

const renderChangePassword = async (req, res, data = {}) => {
    const passwordStatus =
        await getChangePasswordBlockState(req.user._id);

    if (!passwordStatus.user) {
        return res.redirect("/logout");
    }

    let attemptsLeft = passwordStatus.attemptsLeft;

    if (data.attemptsLeft !== undefined) {
        attemptsLeft = data.attemptsLeft;
    }

    const successMessage = data.success || null;
    const errorMessage = data.error || null;

    return res.render("profile/changePassword", {
        success: successMessage,
        error: errorMessage,
        isChangePasswordBlocked: passwordStatus.isBlocked,
        remainingSeconds: passwordStatus.remainingSeconds,
        attemptsLeft: attemptsLeft,
        maxChangePasswordAttempts: maxPasswordattept
    });
};

const profilePage = (req, res) => {
    let successMessage = null;

    if (req.query.success) {
        successMessage = "Profile updated successfully.";
    }

    return res.render("profile/profile", {
        success: successMessage,
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

        const roleIsValid = validateRole(profileData.role);

        if (!roleIsValid) {
            return res.render("profile/profile", {
                success: null,
                error: "Please select a valid role."
            });
        }

        const languageIsValid = validateLanguage(profileData.languages);

        if (!languageIsValid) {
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
            profileData.profileImage = `profiles/${req.file.filename}`;

            removeOldProfileImage(oldUser.profileImage);
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            profileData,
            {
                returnDocument: "after",
                runValidators: true
            }
        );

        req.login(updatedUser, (loginError) => {
            if (loginError) {
                return res.render("profile/profile", {
                    success: null,
                    error: "Profile updated, but session refresh failed. Please login again."
                });
            }

            return res.redirect("/profile?success=1");
        });
    } catch (error) {
        console.error("Profile update error:", error);

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
                maxChangePasswordAttempts: maxPasswordattept
            });
        }

        const oldPassword = clean(req.body.oldPassword);
        const newPassword = clean(req.body.newPassword);
        const confirmPassword = clean(req.body.confirmPassword);

        if (!oldPassword) {
            return renderChangePassword(req, res, {
                error: "Please fill old password, new password and confirm password."
            });
        }

        if (!newPassword) {
            return renderChangePassword(req, res, {
                error: "Please fill old password, new password and confirm password."
            });
        }

        if (!confirmPassword) {
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

        const oldPasswordMatches = await bcrypt.compare(
            oldPassword,
            user.password
        );

        if (!oldPasswordMatches) {
            let attempts = user.changePasswordAttempts || 0;
            attempts = attempts + 1;

            user.changePasswordAttempts = attempts;

            if (attempts >= maxPasswordattept) {
                user.changePasswordAttempts = maxPasswordattept;

                const lockUntil = Date.now() + lockTime;
                user.changePasswordLockUntil = new Date(lockUntil);

                await user.save();

                const remainingSeconds = parseInt(
                    lockTime / 1000
                );

                return res.status(429).render(
                    "profile/changePassword",
                    {
                        success: null,
                        error: "Too many incorrect attempts. Change password is disabled for 30 minutes.",
                        isChangePasswordBlocked: true,
                        remainingSeconds,
                        attemptsLeft: 0,
                        maxChangePasswordAttempts:
                            maxPasswordattept
                    }
                );
            }

            await user.save();

            const attemptsLeft =
                maxPasswordattept -
                user.changePasswordAttempts;

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

        req.logout((logoutError) => {
            if (logoutError) {
                return next(logoutError);
            }

            req.session.destroy((sessionError) => {
                if (sessionError) {
                    return next(sessionError);
                }

                res.clearCookie("connect.sid");
                res.clearCookie("sessionId");

                return res.redirect("/login?passwordChanged=1");
            });
        });
    } catch (error) {
        console.error("Change password error:", error);

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