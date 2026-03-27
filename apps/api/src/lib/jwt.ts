import { SignJWT, jwtVerify } from 'jose';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Non-null assertion safe: validated at module load above
const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, secret);
  if (!payload.sub) {
    throw new Error('Invalid token: missing sub claim');
  }
  return { sub: payload.sub };
}
