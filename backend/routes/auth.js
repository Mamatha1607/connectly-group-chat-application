const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");

const router = express.Router();

// REGISTER: Handles new user sign-ups with validation and hashed passwords
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, repassword, dob, securityQuestion } = req.body;

    // Simple password match check
    if (password !== repassword) {
      return res.status(400).json({ msg: "Passwords do not match" });
    }

    // Prevent duplicate accounts
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    // Hash password before saving
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Create and save the new user
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashed,
      dob,
      securityQuestion,
    });

    await user.save();
    res.status(201).json({ msg: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ msg: "Error registering user", error: err.message });
  }
});

// LOGIN: Authenticates user and returns JWT if successful
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: "Invalid credentials" });

    // Compare provided password with hashed one
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    // Sign JWT and send it to the client
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token, user: { firstName: user.firstName, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: "Login failed", error: err.message });
  }
});

// FORGOT PASSWORD: Generates and emails a one-time password (OTP) for reset
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) return res.status(400).json({ msg: "User not found" });

  // Create OTP and set expiry (10 minutes)
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiry = Date.now() + 10 * 60 * 1000;

  user.otp = otp;
  user.otpExpires = expiry;
  await user.save();

  // Send OTP to user's email
  await sendEmail(email, "Connectly OTP", `Your OTP is: ${otp}`);
  res.json({ msg: "OTP sent to email" });
});

// RESET PASSWORD: Validates OTP and updates the user's password
router.post("/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: "User not found" });

  // Check if OTP is correct and still valid
  if (user.otp !== otp || user.otpExpires < Date.now()) {
    return res.status(400).json({ msg: "Invalid or expired OTP" });
  }

  // Hash the new password and clear OTP fields
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  user.otp = undefined;
  user.otpExpires = undefined;
  await user.save();

  res.json({ msg: "Password reset successful" });
});

module.exports = router;
