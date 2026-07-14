const emailRegex = /^[A-Za-z0-9._%+-]+@gmail\.com$/;
const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const roleValues = ["User", "Admin"];
const languageValues = ["English", "Hindi", "Gujarati"];

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeEmail = (email) => clean(email).toLowerCase();

const validateGmail = (email) => {
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
        return "Email is required.";
    }

    if (/\s/.test(email || "")) {
        return "Email should not contain spaces.";
    }

    if (!emailRegex.test(normalizedEmail)) {
        return "Please enter a valid Gmail address ending with @gmail.com.";
    }

    return null;
};

const validateStrongPassword = (password) => {
    const value = clean(password);

    if (!value) {
        return "Password is required.";
    }

    if (!strongPasswordRegex.test(value)) {
        return "Password must contain minimum 8 characters, one uppercase, one lowercase, one number and one special character.";
    }

    return null;
};

const validateRole = (role) => {
    const value = clean(role);
    return !value || roleValues.includes(value);
};

const validateLanguage = (language) => {
    const value = clean(language);
    return !value || languageValues.includes(value);
};

module.exports = {
    emailRegex,
    strongPasswordRegex,
    roleValues,
    languageValues,
    clean,
    normalizeEmail,
    validateGmail,
    validateStrongPassword,
    validateRole,
    validateLanguage
};
