const config = {
  mongodb: {
    url: process.env.MONGODB_MIGRATE_URI || 'mongodb://127.0.0.1:27017/crm?replicaSet=rs0',
    databaseName: process.env.MONGODB_DATABASE || 'crm',
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migration_changelog',
  lockCollectionName: 'migration_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  // Applied migrations are immutable by filename; old deployed copies may have
  // recorded checksums from before Atlas role management was removed.
  useFileHash: false,
};

module.exports = config;
