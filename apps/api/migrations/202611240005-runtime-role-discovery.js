// Migrations must authenticate with a separate identity carrying crmMigrator.
module.exports = {
  async up(db) {
    const result = await db.client
      .db('admin')
      .command({ rolesInfo: { role: 'crmMigrator', db: 'admin' } });
    if (!result.roles?.length)
      throw new Error('Required MongoDB role crmMigrator@admin is missing.');
  },
  async down() {},
};
