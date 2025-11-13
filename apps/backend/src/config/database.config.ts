export const DatabaseConfig = () => ({
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/autodeploy',
  },
});
