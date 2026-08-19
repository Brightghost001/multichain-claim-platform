// ═══════════════════════════════════════════════════════════
// Server entry point — API + worker
// ═══════════════════════════════════════════════════════════

import 'dotenv/config';
import { buildServer } from './api/routes';
import { ClaimProcessor } from './workers/claimProcessor';

const PORT = Number(process.env.API_PORT) || 4000;

async function main() {
  const app = await buildServer();

  // Start claim processor worker
  const worker = new ClaimProcessor();
  worker.start();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`✅ Claim Platform API running on port ${PORT}`);
    console.log(`✅ Claim processor worker started`);
  } catch (err) {
    app.log.error(err);
    worker.stop();
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => { worker.stop(); process.exit(0); });
  process.on('SIGINT', () => { worker.stop(); process.exit(0); });
}

main();
