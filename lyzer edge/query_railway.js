import sqlite3 from 'sqlite3';

const path1 = 'C:/Users/WDAGUtilityAccount/Downloads/causal_memory.db';
const path2 = 'C:/Users/WDAGUtilityAccount/Downloads/intent_registry.db';

function queryDb(path, name) {
  const db = new sqlite3.Database(path, sqlite3.OPEN_READONLY);
  db.serialize(() => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
      if (err) {
        console.error('Error reading tables:', err);
        return;
      }
      console.log(`\n--- ${name} TABLES ---`);
      console.log(rows.map(r => r.name));
      
      rows.forEach(r => {
        db.all(`SELECT COUNT(*) as c FROM ${r.name}`, [], (err, counts) => {
          if (err) return;
          console.log(`\nTable ${r.name} has ${counts[0].c} rows.`);
        });
        db.all(`SELECT * FROM ${r.name} ORDER BY rowid DESC LIMIT 5`, [], (err, data) => {
          if (err) return;
          console.log(`Data for ${r.name} (last 5):`);
          console.dir(data, { depth: null });
        });
      });
    });
  });
}

queryDb(path1, 'CAUSAL MEMORY');
queryDb(path2, 'INTENT REGISTRY');
