// Roles are provisioned by the MongoDB administrator (Atlas UI/API locally via
// scripts/bootstrap-local-mongo.js). Migrations only assert their presence.
module.exports = {
  async up(db) {
    const result = await db.client
      .db('admin')
      .command({ rolesInfo: { role: 'crmApplication', db: 'admin' } });
    if (!result.roles?.length)
      throw new Error('Required MongoDB role crmApplication@admin is missing.');
  },
  async down() {},
};
