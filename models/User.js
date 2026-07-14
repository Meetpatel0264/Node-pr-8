const mongoose = require("mongoose");
const { emailRegex, roleValues, languageValues } = require("../utils/validation");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [emailRegex, "Please enter a valid Gmail address"]
        },
        password: {
            type: String,
            required: true,
            trim: true
        },
        profileImage: {
            type: String,
            default: "",
            trim: true
        },
        status: {
            type: String,
            default: "",
            trim: true
        },
        role: {
            type: String,
            enum: ["", ...roleValues],
            default: "User",
            trim: true
        },
        country: {
            type: String,
            default: "",
            trim: true
        },
        languages: {
            type: String,
            enum: ["", ...languageValues],
            default: "",
            trim: true
        },
        contact: {
            type: String,
            default: "",
            trim: true
        },
        backendDeveloper: {
            type: String,
            default: "",
            trim: true
        },
        location: {
            type: String,
            default: "",
            trim: true
        },
        dateOfBirth: {
            type: String,
            default: "",
            trim: true
        },
        githubUsername: {
            type: String,
            default: "",
            trim: true
        },
        linkedinUrl: {
            type: String,
            default: "",
            trim: true
        },
        instagramUrl: {
            type: String,
            default: "",
            trim: true
        },
        twitterUrl: {
            type: String,
            default: "",
            trim: true
        },
        changePasswordAttempts: {
            type: Number,
            default: 0
        },
        changePasswordLockUntil: {
            type: Date,
            default: null
        },
        forgotPasswordOtp: {
            type: String,
            default: null
        },
        forgotPasswordOtpExpires: {
            type: Date,
            default: null
        },
        forgotPasswordToken: {
            type: String,
            unique: true,
            sparse: true,
            default: undefined
        },
        forgotPasswordOtpVerified: {
            type: Boolean,
            default: false
        },
        forgotPasswordResendAt: {
            type: Date,
            default: null
        }
    }
);

module.exports = mongoose.model("User", userSchema);
