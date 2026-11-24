// Verify the Atlas/local runtime role carries only the immutable DB read+append grant.
module.exports = {
  async up(db) {
    const result = await db.client
      .db('admin')
      .command({ rolesInfo: { role: 'crmApplication', db: 'admin' }, showPrivileges: true });
    const role = result.roles?.[0];
    if (!role) throw new Error('Required MongoDB role crmApplication@admin is missing.');
    const immutable = (role.privileges ?? []).filter(
      (grant) => grant.resource?.db === 'crm_immutable',
    );
    if (
      !immutable.length ||
      immutable.some((grant) =>
        grant.actions.some((action) => !['find', 'insert'].includes(action)),
      )
    ) {
      throw new Error('crmApplication must have only find/insert privileges on crm_immutable.');
    }
    if (
      immutable.some(
        (grant) => !grant.actions.includes('find') || !grant.actions.includes('insert'),
      )
    ) {
      throw new Error('crmApplication must have find and insert privileges on crm_immutable.');
    }
  },
  async down() {},
};
