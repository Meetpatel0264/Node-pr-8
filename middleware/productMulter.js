const multer = require("multer");
const fs = require("fs");
const path = require("path");

const productUploadDir = path.join("uploads", "products");

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync(productUploadDir)) {
    fs.mkdirSync(productUploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, productUploadDir);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9-]/g, "-")
            .replace(/-+/g, "-");

        cb(null, `${Date.now()}-${baseName}${extension.toLowerCase()}`);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (allowedTypes.includes(file.mimetype)) {
        return cb(null, true);
    }

    cb(new Error("Only JPG, PNG and WEBP product images are allowed."));
};

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});
