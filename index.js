const express = require("express");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const passport = require("./middleware/passport");
const expressSession = require("express-session");
const localsMiddleware = require("./middleware/locals");

const app = express();
const PORT = 9094;

connectDB();

app.set("view engine", "ejs");

app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    expressSession({
        secret: "mysecretkey",
        resave: false,
        saveUninitialized: false
    })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(localsMiddleware);

app.use("/", require("./routes"));

app.listen(PORT, (err) => {
    if(!err){
        console.log(`Server running on http://localhost:${PORT}`);
    }else{
        console.log("Error ======> ", err);
    }
});
