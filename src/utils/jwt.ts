import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!; // 请替换为你的密钥

// 生成JWT
export function signJwt(payload: Record<string,any>, expiresIn = '24h'): string {
  return jwt.sign({...payload,exp: Math.floor(Date.now() / 1000) + (60 * 60)*24,}, JWT_SECRET );
}

// 验证并解密JWT
export function verifyJwt<T = any>(token: string): T | null {
  return jwt.verify(token, JWT_SECRET) as T;
}