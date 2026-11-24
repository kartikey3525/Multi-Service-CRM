import mongoose from 'mongoose';
import { loadConfig } from './config';
import { provisionIdentity } from './modules/identity/provisioning';

async function seed(): Promise<void> {
  const config = loadConfig();
  await mongoose.connect(config.MONGODB_URI);
  try {
    await provisionIdentity();
    console.log(JSON.stringify({ level: 'info', message: 'seed_complete', database: 'connected' }));
  } finally {
    await mongoose.disconnect();
  }
}

void seed().catch((error: unknown) => {
  const safeMessage = error instanceof Error ? error.name : 'unknown seed error';
  console.error(JSON.stringify({ level: 'error', message: 'seed_failed', error: safeMessage }));
  process.exitCode = 1;
});
