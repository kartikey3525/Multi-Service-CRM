const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/franchise_crm?replicaSet=rs0',
    databaseName: process.env.MONGODB_DATABASE || 'franchise_crm',
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migration_changelog',
  lockCollectionName: 'migration_lock',
  lockTtl: 0,
  migrationFileExtension: '.js',
  useFileHash: true,
};

module.exports = config;
