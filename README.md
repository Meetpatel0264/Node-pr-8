# Admin Panel - Category CRUD

This project includes authentication, profile management, change password, dashboard, and category CRUD.

## Updated Work

- Sidebar has a Category accordion menu
- Add Category page added
- View Category page added in table format
- Edit category working
- Delete category working
- Category model added with MongoDB
- Responsive UI added for category pages

## Category Routes

| Method | Route | Work |
|---|---|---|
| GET | `/add-category` | Add category page |
| POST | `/add-category` | Store category |
| GET | `/view-category` | View category table |
| GET | `/edit-category/:id` | Edit category page |
| POST | `/update-category/:id` | Update category |
| GET | `/delete-category/:id` | Delete category |

## Run Project

```bash
npm install
npm start
```

Make sure MongoDB is running before starting the project.

## Forgot Password OTP Flow

- OTP package: `otp-generator@4.0.1`
- Unique reset identity: Node.js built-in `crypto.randomUUID()`
- OTP length: 6 numeric digits
- OTP expiry: 10 minutes using `Date.now()`
- Resend cooldown: 30 seconds
- OTP is sent to the registered Gmail address using Nodemailer and Gmail SMTP.
- OTP is stored in MongoDB as a String.

### Routes

- `POST /forgatePassword` - validate email and generate OTP
- `POST /forgot-password/verify-otp` - verify OTP
- `POST /forgot-password/resend-otp` - generate a new OTP after 30 seconds
- `POST /forgot-password/reset` - update password after OTP verification

> The current project uses Gmail SMTP for OTP delivery. For production, keep credentials outside source control and store a hash of the OTP instead of plain text.
