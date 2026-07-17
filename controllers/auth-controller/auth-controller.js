const User = require("../../models/User");
const bcrypt = require("bcrypt");
const passport = require("../../middleware/passport");
const { clean, normalizeEmail, validateGmail, validateStrongPassword } = require("../../utils/validation");
const {
    generateOtp,
    generateResetToken,
    getOtpExpiry,
    getResendAvailableAt,
    isExpired
} = require("../../utils/otp");
const { sendOtpEmail } = require("../../utils/trasport");

const renderLogin = (req, res) => {
    res.render("auth/login", {
        error: req.query.error || null,
        success: req.query.passwordChanged ? "Password changed successfully. Please login again with your new password." : null
    });
};

const renderRegister = (req, res) => {
    res.render("auth/register", { error: null, success: null });
};

const registerUser = async (req, res) => {
    try {
        const username = clean(req.body.username);
        const email = normalizeEmail(req.body.email);
        const password = clean(req.body.password);
        const confirmPassword = clean(req.body.confirmPassword);

        if (!username || !email || !password || !confirmPassword) {
            return res.render("auth/register", { error: "All fields are required.", success: null });
        }

        const emailError = validateGmail(req.body.email);
        if (emailError) {
            return res.render("auth/register", { error: emailError, success: null });
        }

        const passwordError = validateStrongPassword(password);
        if (passwordError) {
            return res.render("auth/register", { error: passwordError, success: null });
        }

        if (password !== confirmPassword) {
            return res.render("auth/register", { error: "Password and confirm password do not match.", success: null });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.render("auth/register", { error: "Email already registered.", success: null });
        }

        const hashPass = await bcrypt.hash(password, 12);
        await User.create({ username, email, password: hashPass, role: "User" });

        return res.render("auth/login", {
            error: null,
            success: "Account created successfully. Please login."
        });
    } catch (error) {
        console.error(error);
        return res.render("auth/register", { error: "Registration failed. Please try again.", success: null });
    }
};

const loginUser = (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            return res.render("auth/login", { error: "Server error. Please try again.", success: null });
        }

        if (!user) {
            return res.status(401).render("auth/login", {
                error: info && info.message ? info.message : "Invalid credentials.",
                success: null
            });
        }

        req.logIn(user, (loginErr) => {
            if (loginErr) return next(loginErr);
            return res.redirect("/dashboard");
        });
    })(req, res, next);
};

const renderForgotView = (res, data = {}) => {
    return res.render("auth/forgatePassword", {
        error: data.error || null,
        success: data.success || null,
        email: data.email || "",
        token: data.token || "",
        step: data.step || "email",
        resendSeconds: Number.isFinite(data.resendSeconds) ? data.resendSeconds : 0,
        openOtpModal: Boolean(data.openOtpModal)
    });
};

const renderForgotPassword = (req, res) => renderForgotView(res);

const forgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const emailError = validateGmail(email);

        if (emailError) {
            return renderForgotView(res, { error: emailError, email });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return renderForgotView(res, {
                error: "This email is not registered. Please enter your registered Gmail address.",
                email
            });
        }

        const otp = generateOtp();
        const token = generateResetToken();

        user.forgotPasswordOtp = String(otp);
        user.forgotPasswordOtpExpires = getOtpExpiry();
        user.forgotPasswordToken = token;
        user.forgotPasswordOtpVerified = false;
        user.forgotPasswordResendAt = getResendAvailableAt();
        await user.save();

        await sendOtpEmail(user, otp);

        return renderForgotView(res, {
            success: "OTP sent successfully to your registered email address.",
            email,
            token,
            step: "otp",
            resendSeconds: 30,
            openOtpModal: true
        });
    } catch (error) {
        console.error("Generate OTP error:", error);
        return renderForgotView(res, {
            error: "Unable to generate OTP. Please try again.",
            email: req.body.email || ""
        });
    }
};

const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token = clean(req.body.token);
        const otp = clean(req.body.otp);

        if (!email || !token || !otp) {
            return renderForgotView(res, {
                error: "Email, reset token and OTP are required.",
                email,
                token,
                step: "otp",
                openOtpModal: true
            });
        }

        const user = await User.findOne({
            email,
            forgotPasswordToken: token
        });

        if (!user) {
            return renderForgotView(res, {
                error: "Invalid or expired password reset request.",
                email,
                step: "email"
            });
        }

        let resendSeconds = 0;

        if (user.forgotPasswordResendAt) {
            const remainingTime =
                user.forgotPasswordResendAt.getTime() - Date.now();

            if (remainingTime > 0) {
                resendSeconds = parseInt(remainingTime / 1000);
            }
        }

        if (isExpired(user.forgotPasswordOtpExpires)) {
            return renderForgotView(res, {
                error: "OTP has expired. Please resend a new OTP.",
                email,
                token,
                step: "otp",
                resendSeconds,
                openOtpModal: true
            });
        }

        if (String(user.forgotPasswordOtp) !== String(otp)) {
            return renderForgotView(res, {
                error: "Invalid OTP. Please enter the OTP sent to your email address.",
                email,
                token,
                step: "otp",
                resendSeconds,
                openOtpModal: true
            });
        }

        user.forgotPasswordOtpVerified = true;
        user.forgotPasswordOtp = null;
        user.forgotPasswordOtpExpires = null;

        await user.save();

        return renderForgotView(res, {
            success: "OTP verified successfully. Create your new password.",
            email,
            token,
            step: "reset"
        });
    } catch (error) {
        console.error("Verify OTP error:", error);

        return renderForgotView(res, {
            error: "OTP verification failed. Please try again.",
            email: req.body.email || "",
            token: req.body.token || "",
            step: "otp",
            openOtpModal: true
        });
    }
};

const resendForgotPasswordOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token = clean(req.body.token);

        const user = await User.findOne({
            email,
            forgotPasswordToken: token
        });

        if (!user) {
            return renderForgotView(res, {
                error: "Invalid password reset request.",
                email
            });
        }

        if (user.forgotPasswordResendAt) {
            const currentTime = Date.now();
            const resendTime = user.forgotPasswordResendAt.getTime();

            if (currentTime < resendTime) {
                const remainingTime = resendTime - currentTime;
                const resendSeconds = parseInt(remainingTime / 1000);

                return renderForgotView(res, {
                    error: `Please wait ${resendSeconds} seconds before resending OTP.`,
                    email,
                    token,
                    step: "otp",
                    resendSeconds,
                    openOtpModal: true
                });
            }
        }

        const otp = generateOtp();

        user.forgotPasswordOtp = String(otp);
        user.forgotPasswordOtpExpires = getOtpExpiry();
        user.forgotPasswordOtpVerified = false;
        user.forgotPasswordResendAt = getResendAvailableAt();

        await user.save();

        await sendOtpEmail(user, otp);

        return renderForgotView(res, {
            success: "A new OTP was sent to your registered email address.",
            email,
            token,
            step: "otp",
            resendSeconds: 30,
            openOtpModal: true
        });
    } catch (error) {
        console.error("Resend OTP error:", error);

        return renderForgotView(res, {
            error: "Unable to resend OTP. Please try again.",
            email: req.body.email || "",
            token: req.body.token || "",
            step: "otp",
            openOtpModal: true
        });
    }
};

const resetForgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const token = clean(req.body.token);
        const newPassword = clean(req.body.newPassword);
        const confirmPassword = clean(req.body.confirmPassword);

        const user = await User.findOne({
            email,
            forgotPasswordToken: token,
            forgotPasswordOtpVerified: true
        });

        if (!user) {
            return renderForgotView(res, {
                error: "Please verify OTP before resetting your password.",
                email,
                step: "email"
            });
        }

        const passwordError = validateStrongPassword(newPassword);
        if (passwordError) {
            return renderForgotView(res, { error: passwordError, email, token, step: "reset" });
        }

        if (newPassword !== confirmPassword) {
            return renderForgotView(res, {
                error: "New password and confirm password do not match.",
                email,
                token,
                step: "reset"
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.changePasswordAttempts = 0;
        user.changePasswordLockUntil = null;
        user.forgotPasswordOtp = null;
        user.forgotPasswordOtpExpires = null;
        user.forgotPasswordToken = undefined;
        user.forgotPasswordOtpVerified = false;
        user.forgotPasswordResendAt = null;
        await user.save();

        return res.render("auth/login", {
            error: null,
            success: "Password reset successfully. Please login with your new password."
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return renderForgotView(res, {
            error: "Password reset failed. Please try again.",
            email: req.body.email || "",
            token: req.body.token || "",
            step: "reset"
        });
    }
};

const logoutUser = (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);

        req.session.destroy((sessionErr) => {
            if (sessionErr) return next(sessionErr);
            res.clearCookie("connect.sid");
            res.clearCookie("sessionId");
            return res.redirect("/login");
        });
    });
};

module.exports = {
    renderLogin,
    renderRegister,
    registerUser,
    loginUser,
    renderForgotPassword,
    forgotPassword,
    verifyForgotPasswordOtp,
    resendForgotPasswordOtp,
    resetForgotPassword,
    logoutUser
};
