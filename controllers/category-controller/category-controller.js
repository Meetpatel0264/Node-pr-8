const Category = require("../../models/Category");
const Product = require("../../models/Product");
const { clean } = require("../../utils/validation");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const addCategoryPage = (req, res) => {
    res.render("category/addCategory", { error: null, success: null });
};

const addCategory = async (req, res) => {
    try {
        const categoryName = clean(req.body.categoryName);

        if (!categoryName) {
            return res.render("category/addCategory", {
                error: "Category item name is required.",
                success: null
            });
        }

        const existingCategory = await Category.findOne({
            categoryName: categoryName
        });

        if (existingCategory) {
            return res.render("category/addCategory", {
                error: "This category item name already exists.",
                success: null
            });
        }

        await Category.create({ categoryName });
        // res.redirect("/view-category");
        return res.redirect(
            "/view-category?success=category added successfully."
        );
    } catch (error) {
        res.render("category/addCategory", {
            error: "Category not added. Please try again.",
            success: null
        });
    }
};

const viewCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: -1 });
        res.render("category/viewCategory", {
            categories,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        res.redirect("/miscError");
    }
};

const editCategoryPage = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.redirect("/view-category");
        }

        res.render("category/editCategory", { category, error: null });
    } catch (error) {
        res.redirect("/view-category");
    }
};

const updateCategory = async (req, res) => {
    try {
        const categoryName = clean(req.body.categoryName);
        const category = await Category.findById(req.params.id);

        if (!category) {
            return res.redirect("/view-category");
        }

        if (!categoryName) {
            return res.render("category/editCategory", {
                category,
                error: "Category item name is required."
            });
        }

        const existingCategory = await Category.findOne({
            categoryName: categoryName.trim()
        });

        if (existingCategory) {
            return res.render("category/addCategory", {
                error: "This category item name already exists.",
                success: null
            });
        }
        category.categoryName = categoryName;
        await category.save();

        res.redirect("/view-category");
    } catch (error) {
        res.redirect("/view-category");
    }
};

const deleteCategory = async (req, res) => {
    try {
        const linkedProduct = await Product.exists({ categoryId: req.params.id });

        if (linkedProduct) {
            return res.redirect("/view-category?error=This category is used by a product and cannot be deleted.");
        }

        await Category.findByIdAndDelete(req.params.id);
        res.redirect("/view-category?success=Category deleted successfully.");
    } catch (error) {
        res.redirect("/view-category?error=Category not deleted.");
    }
};

module.exports = {
    addCategoryPage,
    addCategory,
    viewCategories,
    editCategoryPage,
    updateCategory,
    deleteCategory
};
