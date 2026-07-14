const crypto = require("crypto");
const otpGenerator = require("otp-generator");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 30 * 1000;

const generateOtp = () => {
    return otpGenerator.generate(6, {
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
    });
};

const generateResetToken = () => crypto.randomUUID();

const getOtpExpiry = () => new Date(Date.now() + OTP_EXPIRY_MS);

const getResendAvailableAt = () => new Date(Date.now() + OTP_RESEND_MS);

const isExpired = (date) => !date || Date.now() > new Date(date).getTime();

module.exports = {
    OTP_EXPIRY_MS,
    OTP_RESEND_MS,
    generateOtp,
    generateResetToken,
    getOtpExpiry,
    getResendAvailableAt,
    isExpired
};