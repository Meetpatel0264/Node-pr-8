const nodemailer = require("nodemailer");

const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: "meetrnw1@gmail.com",
        pass: "vcioxvhxyjqogujs"
    }
});

const sendOtpEmail = async (user, otp) => {
    return transport.sendMail({
        from: "DeskApp <meetrnw1@gmail.com>",
        to: user.email,
        subject: "Forgot Password OTP",
        text: `Your OTP is ${otp}. This OTP is valid for 10 minutes.`
    });
};

module.exports = {
    transport,
    sendOtpEmail
};
