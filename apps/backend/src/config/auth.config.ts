export const AuthConfig = () => ({
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback',
  },
  encryption: {
    masterKey: process.env.MASTER_ENCRYPTION_KEY || 'your-master-encryption-key-32-chars',
  },
});
