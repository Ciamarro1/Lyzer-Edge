const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:\\Users\\WDAGUtilityAccount\\Downloads\\historical_causal_memory.db';

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
        return;
    }
});

db.serialize(() => {
    db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", [], (err, tables) => {
        if (err) {
            console.error(err.message);
            return;
        }
        
        let output = "=== SCHEMA DUMP ===\n";
        tables.forEach((table) => {
            output += `Table: ${table.name}\n`;
            output += `${table.sql}\n\n`;
        });
        
        fs.writeFileSync('schema_output_utf8.txt', output, 'utf8');
        console.log("Written to schema_output_utf8.txt");
    });
});

db.close();
