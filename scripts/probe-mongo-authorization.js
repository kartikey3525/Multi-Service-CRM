async function run() {
  const immutable = db.getSiblingDB('crm_immutable');
  const id = `authorization-probe-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const probe = { _id: id, action: 'authorization_probe', entity: 'probe', createdAt: new Date() };
  await immutable.audit_log.insertOne(probe);
  if ((await immutable.audit_log.findOne({ _id: id }))?.action !== 'authorization_probe') {
    throw new Error('FAIL: runtime role could not read appended audit entry.');
  }
  for (const [label, operation] of [
    ['update', () => immutable.audit_log.updateOne({ _id: id }, { $set: { action: 'tampered' } })],
    ['delete', () => immutable.audit_log.deleteOne({ _id: id })],
  ]) {
    try {
      await operation();
      throw new Error(`FAIL: runtime role unexpectedly permitted audit ${label}.`);
    } catch (error) {
      if (error.message.startsWith('FAIL:')) throw error;
      if (![13, 8000].includes(error.code)) throw error;
    }
  }
  print('PASS: runtime can find/insert crm_immutable audit entries; update/delete are denied.');
}

run().catch((error) => {
  print(error.stack ?? error.message ?? 'FAIL: authorization probe failed.');
  quit(1);
});
