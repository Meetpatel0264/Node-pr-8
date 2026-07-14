const express = require("express");
const authController = require("../controllers/auth-controller/auth-controller");
const dashboardController = require("../controllers/dashboard-controller/dashboard-controller");
const categoryController = require("../controllers/category-controller/category-controller");
const profileController = require("../controllers/profile-controller/profile-controller");
const productController = require("../controllers/product-controller/product-controller");
const upload = require("../middleware/multer");
const productUpload = require("../middleware/productMulter");
const { isLoggedIn, checkUserLogin, checkUserLogout } = require("../middleware/user-check/userCheck");

const router = express.Router();

router.get("/", (req, res) => {
    if (isLoggedIn(req)) {
        return res.redirect("/dashboard");
    }

    res.redirect("/login");
});

router.get("/login", checkUserLogout, authController.renderLogin);

router.post("/login", checkUserLogout, authController.loginUser);

router.get("/register", checkUserLogout, authController.renderRegister);

router.post("/register", checkUserLogout, authController.registerUser);

router.get("/forgatePassword", checkUserLogout, authController.renderForgotPassword);

router.post("/forgatePassword", checkUserLogout, authController.forgotPassword);

router.post("/forgot-password/verify-otp", checkUserLogout, authController.verifyForgotPasswordOtp);

router.post("/forgot-password/resend-otp", checkUserLogout, authController.resendForgotPasswordOtp);

router.post("/forgot-password/reset", checkUserLogout, authController.resetForgotPassword);

router.get("/logout", authController.logoutUser);

router.get("/dashboard", checkUserLogin, dashboardController.dashboard);

router.get("/profile", checkUserLogin, profileController.profilePage);

router.post("/profile", checkUserLogin, upload.single("profileImage"), profileController.updateProfile);

router.get("/change-password", checkUserLogin, profileController.changePasswordPage);

router.post("/change-password", checkUserLogin, profileController.changePassword);

router.get("/analytics", (req, res) => res.redirect("/dashboard"));

router.get("/add-category", checkUserLogin, categoryController.addCategoryPage);

router.post("/add-category", checkUserLogin, categoryController.addCategory);

router.get("/view-category", checkUserLogin, categoryController.viewCategories);

router.get("/edit-category/:id", checkUserLogin, categoryController.editCategoryPage);

router.post("/update-category/:id", checkUserLogin, categoryController.updateCategory);

router.get("/delete-category/:id", checkUserLogin, categoryController.deleteCategory);


router.get("/add-product", checkUserLogin, productController.addProductPage);

router.post("/add-product", checkUserLogin, productUpload.single("productImage"), productController.addProduct);

router.get("/view-product", checkUserLogin, productController.viewProducts);

router.get("/edit-product/:id", checkUserLogin, productController.editProductPage);

router.post("/update-product/:id", checkUserLogin, productUpload.single("productImage"), productController.updateProduct);

router.get("/delete-product/:id", checkUserLogin, productController.deleteProduct);

router.get("/miscError", (req, res) => {
    res.status(404).render("Misc/miscError");
});

router.get("/underMaintenance", (req, res) => {
    res.render("Misc/underMaintenance");
});

router.use((req, res) => {
    res.status(404).render("Misc/miscError");
});

module.exports = router;
