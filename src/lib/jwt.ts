import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;
const REFRESH = process.env.JWT_REFRESH_SECRET!;

export function signToken(payload: object) {
  return jwt.sign(payload, SECRET, { expiresIn: "1h" });
}

export function signRefresh(payload: object) {
  return jwt.sign(payload, REFRESH, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET);
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, REFRESH);
}
