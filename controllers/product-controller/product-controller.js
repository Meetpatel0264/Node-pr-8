const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../../models/Product");
const Category = require("../../models/Category");
const { clean } = require("../../utils/validation");

const removeProductImage = (imagePath) => {
    if (!imagePath) {
        return;
    }

    const cleanImagePath = imagePath.replace(/^\/+/, "");
    const fullPath = `./${cleanImagePath}`;

    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

const getCategories = () => Category.find().sort({ categoryName: 1 });

const addProductPage = async (req, res) => {
    try {
        const categories = await getCategories();
        res.render("product/addProduct", {
            categories,
            error: null,
            formData: {}
        });
    } catch (error) {
        res.redirect("/miscError");
    }
};

const addProduct = async (req, res) => {
    const formData = req.body;

    try {
        const productName = clean(req.body.productName);
        const categoryId = req.body.categoryId;
        const price = Number(req.body.price);
        const quantity = Number(req.body.quantity);
        const description = clean(req.body.description);
        const categories = await getCategories();

        const removeUploadedImage = () => {
            if (req.file) {
                removeProductImage(
                    `/uploads/products/${req.file.filename}`
                );
            }
        };

        if (!productName) {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Product name is required.",
                formData
            });
        }

        if (!categoryId) {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Please select a category.",
                formData
            });
        }

        if (req.body.price === "") {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Product price is required.",
                formData
            });
        }

        if (req.body.quantity === "") {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Product quantity is required.",
                formData
            });
        }

        if (!req.file) {
            return res.render("product/addProduct", {
                categories,
                error: "Please select a product image.",
                formData
            });
        }

        let category = null;

        try {
            category = await Category.findById(categoryId);
        } catch (error) {
            category = null;
        }

        if (!category) {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Please select a valid category.",
                formData
            });
        }

        if (req.body.quantity === "") {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Product quantity is required.",
                formData
            });
        }

        if (quantity < 0) {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Quantity cannot be negative.",
                formData
            });
        }

        if (quantity % 1 !== 0) {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Quantity must be a whole number.",
                formData
            });
        }

        if (req.body.price === "" || req.body.price < 0) {
            removeUploadedImage();

            return res.render("product/addProduct", {
                categories,
                error: "Price must be 0 or more.",
                formData
            });
        }

        await Product.create({
            productName,
            categoryId: category._id,
            price,
            quantity,
            description,
            productImage: `/uploads/products/${req.file.filename}`
        });

        return res.redirect(
            "/view-product?success=Product added successfully."
        );
    } catch (error) {
        if (req.file) {
            removeProductImage(
                `/uploads/products/${req.file.filename}`
            );
        }

        const categories = await getCategories().catch(() => []);

        return res.render("product/addProduct", {
            categories,
            error: error.message || "Product not added. Please try again.",
            formData
        });
    }
};

const viewProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .populate("categoryId", "categoryName")
            .sort({ createdAt: -1 });

        res.render("product/viewProduct", {
            products,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        res.redirect("/miscError");
    }
};

const editProductPage = async (req, res) => {
    try {
        const [product, categories] = await Promise.all([
            Product.findById(req.params.id),
            getCategories()
        ]);

        if (!product) return res.redirect("/view-product?error=Product not found.");

        res.render("product/editProduct", {
            product,
            categories,
            error: null
        });
    } catch (error) {
        res.redirect("/view-product?error=Unable to open product.");
    }
};

const updateProduct = async (req, res) => {
    let product;

    try {
        product = await Product.findById(req.params.id);
        const categories = await getCategories();

        if (!product) {
            if (req.file) removeProductImage(`/uploads/products/${req.file.filename}`);
            return res.redirect("/view-product?error=Product not found.");
        }

        const productName = clean(req.body.productName);
        const categoryId = req.body.categoryId;
        const price = Number(req.body.price);
        const quantity = Number(req.body.quantity);
        const description = clean(req.body.description);

        if (!productName || !categoryId || req.body.price === "" || req.body.quantity === "") {
            if (req.file) removeProductImage(`/uploads/products/${req.file.filename}`);
            return res.render("product/editProduct", {
                product,
                categories,
                error: "Product name, category, price and quantity are required."
            });
        }

        if (!mongoose.Types.ObjectId.isValid(categoryId) || !(await Category.exists({ _id: categoryId }))) {
            if (req.file) removeProductImage(`/uploads/products/${req.file.filename}`);
            return res.render("product/editProduct", {
                product,
                categories,
                error: "Please select a valid category."
            });
        }

        if (!Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 0) {
            if (req.file) removeProductImage(`/uploads/products/${req.file.filename}`);
            return res.render("product/editProduct", {
                product,
                categories,
                error: "Price must be 0 or more and quantity must be a whole number."
            });
        }

        const oldImage = product.productImage;
        product.productName = productName;
        product.categoryId = categoryId;
        product.price = price;
        product.quantity = quantity;
        product.description = description;

        if (req.file) {
            product.productImage = `/uploads/products/${req.file.filename}`;
        }

        await product.save();

        if (req.file) removeProductImage(oldImage);
        res.redirect("/view-product?success=Product updated successfully.");
    } catch (error) {
        if (req.file) removeProductImage(`/uploads/products/${req.file.filename}`);
        res.redirect("/view-product?error=Product not updated.");
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (product) removeProductImage(product.productImage);
        res.redirect("/view-product?success=Product deleted successfully.");
    } catch (error) {
        res.redirect("/view-product?error=Product not deleted.");
    }
};

module.exports = {
    addProductPage,
    addProduct,
    viewProducts,
    editProductPage,
    updateProduct,
    deleteProduct
};
