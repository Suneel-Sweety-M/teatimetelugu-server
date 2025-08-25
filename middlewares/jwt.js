import bcrypt from "bcryptjs";
import JWT from "jsonwebtoken";

export const userAuth = (req, res, next) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res
      .status(401)
      .send({ status: "fail", message: "No token provided!" });
  }

  try {
    const decoded = JWT.verify(token, process.env.JWT_REFRESH_SECRET_KEY);
    req.user = { user: decoded.user };
    next();
  } catch (err) {
    console.error(err);
    return res
      .status(403)
      .send({ status: "fail", message: "Invalid or expired token!" });
  }
};

export const hashString = async (useValue) => {
  const salt = await bcrypt.genSalt(10);
  const hashedpassword = await bcrypt.hash(useValue, salt);
  return hashedpassword;
};

export const compareString = async (password, userPassword) => {
  const isMatch = await bcrypt.compare(password, userPassword);
  return isMatch;
};

// JSON WEBTOKEN functions
export function createJWT(user) {
  return JWT.sign({ user }, process.env.JWT_SECRET_KEY, {
    expiresIn: "15m",
  });
}

export function createRefreshJWT(user) {
  return JWT.sign({ user }, process.env.JWT_REFRESH_SECRET_KEY, {
    expiresIn: "7d",
  });
}

// Add this function to verify refresh tokens
export function verifyRefreshJWT(token) {
  return JWT.verify(token, process.env.JWT_REFRESH_SECRET_KEY);
}
