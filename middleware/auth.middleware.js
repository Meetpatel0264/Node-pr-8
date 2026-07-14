const checkLoginStatus = (req) => {
    return req.isAuthenticated && req.isAuthenticated();
};

module.exports = {
    checkLoginStatus
};
