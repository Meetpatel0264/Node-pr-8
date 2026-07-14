const multer = require("multer");
const fs = require("fs");

const profileUploadDir = "uploads/profiles";

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync(profileUploadDir)) {
    fs.mkdirSync(profileUploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileUploadDir);
    },
    filename: (req, file, cb) => {
        const cleanName = file.originalname.replace(/\s+/g, "-");
        cb(null, Date.now() + "-" + cleanName);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
        return cb(null, true);
    }

    cb(new Error("Only image file allowed"));
};

module.exports = multer({ storage, fileFilter });
