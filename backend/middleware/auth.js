const jwt = require("jsonwebtoken");

// Middleware to protect routes and verify JWT tokens
const auth = (req, res, next) => {
  // Get the token from the 'Authorization' header (format: Bearer <token>)
  const token = req.header("Authorization")?.replace("Bearer ", "");

  // If there's no token, deny access right away
  if (!token) return res.status(401).json({ msg: "No token, access denied" });

  try {
    // Verify the token using your secret key
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the verified user payload to the request object
    req.user = verified;

    // Move on to the next middleware or route handler
    next();
  } catch (err) {
    // If verification fails (token is invalid/expired), block access
    res.status(401).json({ msg: "Invalid or expired token" });
  }
};

module.exports = auth;
