const localsMiddleware = (req, res, next) => {
    res.locals.loginUser = req.user || null;
    res.locals.sessionId = req.sessionID || null;
    res.locals.currentPath = req.path || "";

    const userImage = req.user?.profileImage || "";

    res.locals.profileImageUrl = userImage
        ? `/uploads/${userImage}`
        : "/images/dashboard/Profile.png";

    next();
};

module.exports = localsMiddleware;