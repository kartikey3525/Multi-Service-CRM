import 'reflect-metadata';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { loadConfig } from './config';
import { EmailOutboxModel } from './modules/identity/models';

const maximumAttempts = 5;
const idleDelayMs = 2_000;
let stopping = false;

function renderEmail(
  template: string,
  variables: Record<string, string>,
): { subject: string; text: string } {
  if (template === 'password_reset') {
    const resetUrl = variables.resetUrl ?? '';
    return {
      subject: 'Reset your Service Network password',
      text: `A password reset was requested for your account. Use this link within one hour:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this message.`,
    };
  }
  throw new Error(`Unsupported email template: ${template}`);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWorker(): Promise<void> {
  const config = loadConfig();
  await mongoose.connect(config.MONGODB_URI);
  const transport = config.SMTP_URL ? nodemailer.createTransport(config.SMTP_URL) : undefined;
  process.on('SIGTERM', () => {
    stopping = true;
  });
  process.on('SIGINT', () => {
    stopping = true;
  });
  console.log(JSON.stringify({ level: 'info', message: 'worker_started' }));

  try {
    while (!stopping) {
      const staleBefore = new Date(Date.now() - 5 * 60_000);
      await EmailOutboxModel.updateMany(
        { status: 'sending', lockedAt: { $lt: staleBefore } },
        {
          $set: { status: 'pending', nextAttemptAt: new Date() },
          $unset: { lockedAt: 1 },
        },
      );
      const item = await EmailOutboxModel.findOneAndUpdate(
        {
          status: 'pending',
          attempts: { $lt: maximumAttempts },
          nextAttemptAt: { $lte: new Date() },
        },
        { $set: { status: 'sending', lockedAt: new Date() } },
        { sort: { createdAt: 1 }, new: true },
      );
      if (!item) {
        await wait(idleDelayMs);
        continue;
      }

      try {
        if (!transport) throw new Error('SMTP is not configured.');
        const variables =
          item.variables instanceof Map ? Object.fromEntries(item.variables) : item.variables;
        const message = renderEmail(item.template, variables as Record<string, string>);
        await transport.sendMail({
          from: config.MAIL_FROM,
          to: item.to,
          subject: message.subject,
          text: message.text,
        });
        await EmailOutboxModel.updateOne(
          { _id: item._id },
          {
            $set: { status: 'sent', sentAt: new Date() },
            $unset: { lockedAt: 1, lastError: 1 },
          },
        );
      } catch (error) {
        const attempts = item.attempts + 1;
        const failed = attempts >= maximumAttempts;
        const retrySeconds = Math.min(15 * 60, 30 * 2 ** (attempts - 1));
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        await EmailOutboxModel.updateOne(
          { _id: item._id },
          {
            $set: {
              status: failed ? 'failed' : 'pending',
              attempts,
              nextAttemptAt: new Date(Date.now() + retrySeconds * 1_000),
              lastError: errorName,
            },
            $unset: { lockedAt: 1 },
          },
        );
        console.error(
          JSON.stringify({
            level: 'error',
            message: 'email_delivery_failed',
            template: item.template,
            attempt: attempts,
            terminal: failed,
          }),
        );
      }
    }
  } finally {
    await mongoose.disconnect();
  }
}

void runWorker().catch((error: unknown) => {
  const safeMessage = error instanceof Error ? error.name : 'unknown worker error';
  console.error(
    JSON.stringify({ level: 'error', message: 'worker_start_failed', error: safeMessage }),
  );
  process.exitCode = 1;
});
