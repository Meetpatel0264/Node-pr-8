const dashboard = (req, res) => {
    try {
        res.render("dashboard/analytics");
    } catch (error) {
        res.redirect("/miscError");
    }
};

module.exports = {
    dashboard
};
