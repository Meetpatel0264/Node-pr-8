document.addEventListener("DOMContentLoaded", function () {
    const emailRegex = /^[A-Za-z0-9._%+-]+@gmail\.com$/;
    const passwordRules = {
        uppercase: /[A-Z]/,
        lowercase: /[a-z]/,
        number: /\d/,
        special: /[^A-Za-z0-9]/,
        minLength: /.{8,}/
    };

    document.querySelectorAll(".alert, .auth-message-block").forEach(function (alertBox) {
        if (alertBox.querySelector("#changePasswordTimer") || alertBox.classList.contains("change-password-lock-alert") || alertBox.classList.contains("no-auto-hide") || alertBox.dataset.noAutoHide === "true") {
            return;
        }

        setTimeout(function () {
            if (!alertBox) {
                return;
            }

            if (window.bootstrap && bootstrap.Alert && alertBox.classList.contains("alert-dismissible")) {
                const alertInstance = bootstrap.Alert.getOrCreateInstance(alertBox);
                alertInstance.close();
                return;
            }

            alertBox.style.transition = "opacity .3s ease";
            alertBox.style.opacity = "0";
            setTimeout(function () {
                alertBox.remove();
            }, 300);
        }, 10000);
    });

    const togglePasswordInput = function (input, icon) {
        if (!input) {
            return;
        }

        const isPassword = input.getAttribute("type") === "password";
        input.setAttribute("type", isPassword ? "text" : "password");

        if (icon) {
            if (isPassword) {
                icon.classList.remove("ri-eye-off-line");
                icon.classList.add("ri-eye-line");
            } else {
                icon.classList.remove("ri-eye-line");
                icon.classList.add("ri-eye-off-line");
            }
        }
    };

    document.addEventListener("click", function (event) {
        const toggle = event.target.closest(".form-password-toggle .input-group-text, .form-password-toggle i, [data-password-toggle], .toggle-password, .password-toggle-btn, .show-password-btn");

        if (!toggle) {
            return;
        }

        const wrapper = toggle.closest(".form-password-toggle") || toggle.closest(".input-group") || toggle.parentElement;
        const inputGroup = toggle.closest(".input-group");
        const input = (inputGroup && inputGroup.querySelector('input[type="password"], input[type="text"]')) ||
            (wrapper && wrapper.querySelector('input[type="password"], input[type="text"]'));
        const icon = toggle.tagName && toggle.tagName.toLowerCase() === "i" ? toggle : toggle.querySelector("i");

        if (!input || (input.name && !input.name.toLowerCase().includes("password"))) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        togglePasswordInput(input, icon);
    }, true);

    document.querySelectorAll(".form-password-toggle .input-group-text").forEach(function (toggle) {
        toggle.setAttribute("role", "button");
        toggle.setAttribute("tabindex", "0");
        toggle.setAttribute("data-password-toggle", "true");

        toggle.addEventListener("keydown", function (event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggle.click();
            }
        });
    });

    const authForm = document.querySelector('form[action="/register"]');
    if (authForm) {
        const emailInput = authForm.querySelector('#email[name="email"]');
        const passwordInput = authForm.querySelector('#password[name="password"]');
        const confirmPasswordInput = authForm.querySelector('#confirmPassword[name="confirmPassword"]');
        const submitButton = authForm.querySelector('button[type="submit"], button:not([type])');

        if (emailInput) {
            emailInput.setAttribute("type", "email");
            emailInput.setAttribute("pattern", "^[A-Za-z0-9._%+-]+@gmail\\.com$");
            emailInput.setAttribute("title", "Enter a valid Gmail address only, for example abc@gmail.com");
        }

        if (passwordInput && !document.getElementById("passwordRulesBox")) {
            const rulesBox = document.createElement("div");
            rulesBox.id = "passwordRulesBox";
            rulesBox.className = "password-rules small mt-2";
            rulesBox.innerHTML = `
                <div data-rule="uppercase">✖ One uppercase</div>
                <div data-rule="lowercase">✖ One lowercase</div>
                <div data-rule="number">✖ One number</div>
                <div data-rule="special">✖ One special character</div>
                <div data-rule="minLength">✖ Minimum 8 characters</div>
            `;
            const passwordToggle = passwordInput.closest(".form-password-toggle");
            if (passwordToggle) {
                passwordToggle.appendChild(rulesBox);
            }
        }

        const validateRegisterForm = function () {
            const emailOk = emailInput ? emailRegex.test(emailInput.value.trim().toLowerCase()) && !/\s/.test(emailInput.value) : true;
            const passwordValue = passwordInput ? passwordInput.value : "";
            const passwordOk = Object.keys(passwordRules).every(function (rule) {
                const ok = passwordRules[rule].test(passwordValue);
                const row = document.querySelector('#passwordRulesBox [data-rule="' + rule + '"]');
                if (row) {
                    row.textContent = (ok ? "✔" : "✖") + " " + row.textContent.replace(/^✔ |^✖ /, "");
                    row.classList.toggle("text-success", ok);
                    row.classList.toggle("text-danger", !ok);
                }
                return ok;
            });
            const confirmOk = confirmPasswordInput ? confirmPasswordInput.value === passwordValue && confirmPasswordInput.value.length > 0 : true;
            const formOk = emailOk && passwordOk && confirmOk;

            if (emailInput) {
                emailInput.setCustomValidity(emailOk ? "" : "Enter a valid Gmail address without spaces. Example: abc@gmail.com");
            }

            if (confirmPasswordInput) {
                confirmPasswordInput.setCustomValidity(confirmOk ? "" : "Confirm password must match password.");
            }

            if (submitButton) {
                submitButton.disabled = !formOk;
            }
        };

        [emailInput, passwordInput, confirmPasswordInput].forEach(function (input) {
            if (input) {
                input.addEventListener("input", validateRegisterForm);
            }
        });

        validateRegisterForm();
    }

    const loginForm = document.querySelector('form[action="/login"]');
    if (loginForm) {
        const emailInput = loginForm.querySelector('#email[name="email"]');
        if (emailInput) {
            emailInput.setAttribute("type", "email");
            emailInput.setAttribute("pattern", "^[A-Za-z0-9._%+-]+@gmail\\.com$");
            emailInput.setAttribute("title", "Only Gmail address allowed, for example abc@gmail.com");
            emailInput.addEventListener("input", function () {
                const isValid = emailRegex.test(emailInput.value.trim().toLowerCase()) && !/\s/.test(emailInput.value);
                emailInput.setCustomValidity(isValid ? "" : "Enter a valid Gmail address without spaces. Example: abc@gmail.com");
            });
        }
    }

    const changePasswordForm = document.querySelector('form[action="/change-password"]');
    if (changePasswordForm) {
        const newPassword = changePasswordForm.querySelector('#newPassword');
        const confirmPassword = changePasswordForm.querySelector('#confirmPassword');
        const submitButton = changePasswordForm.querySelector('button[type="submit"]');

        const validateChangePassword = function () {
            if (!newPassword || !confirmPassword || !submitButton || submitButton.dataset.blocked === "true") {
                return;
            }

            const passwordOk = Object.keys(passwordRules).every(function (rule) {
                return passwordRules[rule].test(newPassword.value);
            });
            const confirmOk = confirmPassword.value === newPassword.value && confirmPassword.value.length > 0;

            newPassword.setCustomValidity(passwordOk ? "" : "Password must contain minimum 8 characters, one uppercase, one lowercase, one number and one special character.");
            confirmPassword.setCustomValidity(confirmOk ? "" : "Confirm password must match new password.");
        };

        [newPassword, confirmPassword].forEach(function (input) {
            if (input) {
                input.addEventListener("input", validateChangePassword);
            }
        });

        validateChangePassword();
    }
});
