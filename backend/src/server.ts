// ═══════════════════════════════════════════════════════════
// Server entry point
// ═══════════════════════════════════════════════════════════

import 'dotenv/config';
import { buildServer } from './api/routes';

const PORT = Number(process.env.API_PORT) || 4000;

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`✅ Claim Platform API running on port ${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
