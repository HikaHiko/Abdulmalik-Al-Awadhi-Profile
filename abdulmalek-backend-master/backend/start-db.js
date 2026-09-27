const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs = require('fs');

(async () => {
  const dbPath = path.join(__dirname, 'mongo_data');
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(dbPath);
  }

  console.log('Starting local MongoDB server...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbPath: dbPath,
      storageEngine: 'wiredTiger',
    }
  });

  console.log(`✅ MongoDB started successfully!`);
  console.log(`📡 Connection URI: ${mongod.getUri()}`);
  console.log(`💾 Data is persisted in: ${dbPath}`);
  console.log('Press Ctrl+C to stop the database.');
})();
