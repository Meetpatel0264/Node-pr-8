const isLoggedIn = (req) => {
    return req.isAuthenticated && req.isAuthenticated();
};

const checkUserLogin = (req, res, next) => {
    if (!isLoggedIn(req)) {
        return res.redirect("/login");
    }

    next();
};

const checkUserLogout = (req, res, next) => {
    if (isLoggedIn(req)) {
        return res.redirect("/dashboard");
    }

    next();
};

module.exports = {
    isLoggedIn,
    checkUserLogin,
    checkUserLogout
};