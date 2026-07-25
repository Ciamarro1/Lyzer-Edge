use rusqlite::{params, Connection, Result as SqliteResult};
use std::sync::{Arc, Mutex};
use tonic::{transport::Server, Request, Response, Status};
use uuid::Uuid;
use std::time::{SystemTime, UNIX_EPOCH};
use futures::StreamExt;

pub mod lyzer {
    tonic::include_proto!("lyzer");
}

use lyzer::intent_registry_server::{IntentRegistry, IntentRegistryServer};
use lyzer::{
    AppendIntentEventRequest, AppendIntentEventResponse, AuditQueryRequest, AuditQueryResponse,
    AuditQuerySinceVersionRequest, AuditQuerySinceVersionResponse, GetMaxVersionRequest,
    GetMaxVersionResponse, IntentEventRecord, RegisterIntentRequest, RegisterIntentResponse,
};

pub struct LyzerIntentRegistry {
    db: Arc<Mutex<Connection>>,
}

// Sprint 0.6.3: Event Contract Registry Validation
fn is_valid_schema(event_type: &str, version: i32) -> bool {
    // Official catalog of approved schemas
    match (event_type, version) {
        ("CREATED", 1) => true,
        ("RISK_APPROVED", 1) => true,
        ("RISK_REJECTED", 1) => true,
        ("ORDER_PENDING", 1) => true,
        ("ORDER_ACK", 1) => true,
        ("ORDER_PARTIAL", 1) => true,
        ("ORDER_FILLED", 1) => true,
        ("ORDER_REJECTED", 1) => true,
        ("ORDER_CANCELLED", 1) => true,
        ("ORDER_ZOMBIE", 1) => true,
        _ => false,
    }
}

// Reusable persistence logic with Transactional Outbox (Sprint 0.6.1) and Causal Version Lock (Sprint 0.6.2)
fn persist_event_tx(
    db: &mut Connection,
    execution_intent_id: &str,
    event_type: &str,
    correlation_id: &str,
    causation_id: &str,
    event_schema_version: i32,
    expected_version: i32,
    payload_json: &str,
) -> Result<i32, String> {
    
    if !is_valid_schema(event_type, event_schema_version) {
        return Err("SCHEMA_CONFLICT".to_string());
    }

    // Atomic BEGIN
    let tx = db.transaction().map_err(|e| format!("Tx Error: {}", e))?;

    // Determine current version
    let current_version = {
        let mut stmt = tx.prepare("SELECT MAX(version) FROM intent_events WHERE execution_intent_id = ?").unwrap();
        let max_version: Option<i32> = stmt.query_row([&execution_intent_id], |row| row.get(0)).unwrap_or(None);
        max_version.unwrap_or(0)
    };

    // CAUSAL_VERSION_LOCK
    if expected_version != current_version + 1 {
        return Err("VERSION_CONFLICT".to_string());
    }

    let new_version = expected_version;
    let event_id = Uuid::now_v7().to_string();
    let timestamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;

    tx.execute(
        "INSERT INTO intent_events (event_id, execution_intent_id, event_type, correlation_id, causation_id, version, event_schema_version, timestamp_ms, payload_json) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            event_id,
            execution_intent_id,
            event_type,
            correlation_id,
            causation_id,
            new_version,
            event_schema_version,
            timestamp_ms,
            payload_json,
        ],
    ).map_err(|e| format!("DB Insert Error: {}", e))?;

    // Transactional Outbox Insert
    tx.execute(
        "INSERT INTO outbox_events (event_id, published) VALUES (?1, 0)",
        params![event_id],
    ).map_err(|e| format!("Outbox Error: {}", e))?;

    // Atomic COMMIT
    tx.commit().map_err(|e| format!("Commit Error: {}", e))?;

    Ok(new_version)
}

impl LyzerIntentRegistry {
    pub fn new(db: Connection) -> Self {
        Self {
            db: Arc::new(Mutex::new(db)),
        }
    }

    fn init_db(db: &Connection) -> SqliteResult<()> {
        db.execute(
            "CREATE TABLE IF NOT EXISTS intent_events (
                global_version INTEGER PRIMARY KEY AUTOINCREMENT,
                event_id TEXT NOT NULL UNIQUE,
                execution_intent_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                correlation_id TEXT NOT NULL,
                causation_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                event_schema_version INTEGER NOT NULL,
                timestamp_ms INTEGER NOT NULL,
                payload_json TEXT NOT NULL,
                UNIQUE(execution_intent_id, version)
            )",
            [],
        )?;
        db.execute(
            "CREATE TABLE IF NOT EXISTS outbox_events (
                event_id TEXT PRIMARY KEY,
                published BOOLEAN NOT NULL DEFAULT 0
            )",
            [],
        )?;
        Ok(())
    }
}

#[tonic::async_trait]
impl IntentRegistry for LyzerIntentRegistry {
    async fn register_intent(
        &self,
        request: Request<RegisterIntentRequest>,
    ) -> Result<Response<RegisterIntentResponse>, Status> {
        let req = request.into_inner();
        let intent = req.intent.ok_or_else(|| Status::invalid_argument("Intent missing"))?;
        let execution_intent_id = intent.execution_intent_id.clone();
        
        let payload_json = serde_json::to_string(&intent).map_err(|e| Status::internal(e.to_string()))?;
        
        let mut db = self.db.lock().unwrap();

        let exists = {
            let mut stmt = db.prepare("SELECT 1 FROM intent_events WHERE execution_intent_id = ?").unwrap();
            stmt.exists([&execution_intent_id]).unwrap()
        };

        if exists {
            return Err(Status::already_exists("Intent already registered"));
        }

        match persist_event_tx(
            &mut db,
            &execution_intent_id,
            "CREATED",
            &intent.correlation_id,
            &intent.causation_id,
            1, // Schema version 1
            1, // Expected version 1
            &payload_json
        ) {
            Ok(new_version) => {
                println!("REGISTERED Intent UUIDv7: {} (CREATED, version {})", execution_intent_id, new_version);
                Ok(Response::new(RegisterIntentResponse {
                    execution_intent_id,
                    status: "CREATED".to_string(),
                    version: new_version,
                }))
            },
            Err(e) => Err(Status::internal(e))
        }
    }

    async fn append_intent_event(
        &self,
        request: Request<AppendIntentEventRequest>,
    ) -> Result<Response<AppendIntentEventResponse>, Status> {
        let req = request.into_inner();
        let mut db = self.db.lock().unwrap();

        match persist_event_tx(
            &mut db,
            &req.execution_intent_id,
            &req.event_type,
            &req.correlation_id,
            &req.causation_id,
            req.event_schema_version,
            req.expected_version,
            &req.payload_json
        ) {
            Ok(new_version) => {
                println!("APPENDED EVENT {} for Intent {} (version {})", req.event_type, req.execution_intent_id, new_version);
                Ok(Response::new(AppendIntentEventResponse {
                    execution_intent_id: req.execution_intent_id,
                    new_version,
                }))
            },
            Err(e) => {
                if e == "SCHEMA_CONFLICT" {
                    Err(Status::invalid_argument("Event schema version drift detected"))
                } else if e == "VERSION_CONFLICT" {
                    Err(Status::already_exists("Causal version lock conflict"))
                } else {
                    Err(Status::internal(e))
                }
            }
        }
    }

    async fn audit_query(
        &self,
        request: Request<AuditQueryRequest>,
    ) -> Result<Response<AuditQueryResponse>, Status> {
        let req = request.into_inner();
        let db = self.db.lock().unwrap();

        let mut stmt = db.prepare(
            "SELECT event_id, execution_intent_id, event_type, correlation_id, causation_id, version, event_schema_version, timestamp_ms, payload_json, global_version 
             FROM intent_events WHERE execution_intent_id = ? ORDER BY version ASC"
        ).unwrap();

        let event_iter = stmt.query_map([&req.execution_intent_id], |row| {
            Ok(IntentEventRecord {
                event_id: row.get(0)?,
                execution_intent_id: row.get(1)?,
                event_type: row.get(2)?,
                correlation_id: row.get(3)?,
                causation_id: row.get(4)?,
                version: row.get(5)?,
                event_schema_version: row.get(6)?,
                timestamp_ms: row.get(7)?,
                payload_json: row.get(8)?,
                global_version: row.get(9)?,
            })
        }).map_err(|e| Status::internal(e.to_string()))?;

        let mut events = Vec::new();
        for event in event_iter {
            events.push(event.unwrap());
        }

        if events.is_empty() {
            return Err(Status::not_found("Intent not found"));
        }

        Ok(Response::new(AuditQueryResponse { events }))
    }

    async fn audit_query_since_version(
        &self,
        request: Request<AuditQuerySinceVersionRequest>,
    ) -> Result<Response<AuditQuerySinceVersionResponse>, Status> {
        let req = request.into_inner();
        let last_version = req.last_global_version;

        let db_lock = self.db.lock().unwrap();
        let mut stmt = db_lock
            .prepare("SELECT event_id, execution_intent_id, event_type, correlation_id, causation_id, version, event_schema_version, timestamp_ms, payload_json, global_version FROM intent_events WHERE global_version > ? ORDER BY global_version ASC")
            .map_err(|e| Status::internal(e.to_string()))?;

        let event_iter = stmt
            .query_map([&last_version], |row| {
                Ok(IntentEventRecord {
                    event_id: row.get(0)?,
                    execution_intent_id: row.get(1)?,
                    event_type: row.get(2)?,
                    correlation_id: row.get(3)?,
                    causation_id: row.get(4)?,
                    version: row.get(5)?,
                    event_schema_version: row.get(6)?,
                    timestamp_ms: row.get(7)?,
                    payload_json: row.get(8)?,
                    global_version: row.get(9)?,
                })
            })
            .map_err(|e| Status::internal(e.to_string()))?;

        let mut events = Vec::new();
        for ev in event_iter {
            if let Ok(e) = ev {
                events.push(e);
            }
        }

        Ok(Response::new(AuditQuerySinceVersionResponse { events }))
    }

    async fn get_max_version(
        &self,
        _request: Request<GetMaxVersionRequest>,
    ) -> Result<Response<GetMaxVersionResponse>, Status> {
        let db = self.db.lock().unwrap();
        let mut stmt = db.prepare("SELECT MAX(global_version) FROM intent_events").unwrap();
        let max_v: Option<i64> = stmt.query_row([], |row| row.get(0)).unwrap_or(None);
        
        Ok(Response::new(GetMaxVersionResponse {
            max_global_version: max_v.unwrap_or(0),
        }))
    }
}

// Background Worker: NATS Consumer for CCP
async fn pending_events_consumer(db: Arc<Mutex<Connection>>, nats_client: async_nats::Client) {
    let mut sub = match nats_client.subscribe("execution.pending.*").await {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to subscribe to execution.pending.*: {}", e);
            return;
        }
    };
    
    println!("NATS Consumer listening on execution.pending.*");
    
    while let Some(msg) = sub.next().await {
        if let Ok(req) = serde_json::from_slice::<AppendIntentEventRequest>(&msg.payload) {
            let result = {
                let mut db_guard = db.lock().unwrap();
                persist_event_tx(
                    &mut db_guard,
                    &req.execution_intent_id,
                    &req.event_type,
                    &req.correlation_id,
                    &req.causation_id,
                    req.event_schema_version,
                    req.expected_version,
                    &req.payload_json
                )
            }; // MutexGuard dropped here

            match result {
                Ok(new_v) => {
                    println!("NATS CCP: Consumed & Persisted {} (v{})", req.event_type, new_v);
                }
                Err(e) => {
                    println!("NATS CCP: Rejected {} -> {}", req.event_type, e);
                    let rej_subject = format!("execution.rejected.{}", e.to_lowercase());
                    let _ = nats_client.publish(rej_subject, msg.payload.clone()).await;
                }
            }
        } else {
            eprintln!("NATS CCP: Failed to deserialize execution.pending message");
        }
    }
}

// Background Worker: Transactional Outbox Publisher
async fn outbox_publisher_worker(db: Arc<Mutex<Connection>>, nats_client: async_nats::Client) {
    println!("Outbox Publisher background worker started");
    loop {
        let events_to_publish = {
            let db_guard = db.lock().unwrap();
            let mut stmt = db_guard.prepare("
                SELECT e.event_id, i.event_type, i.payload_json, i.execution_intent_id, i.version, i.correlation_id, i.causation_id, i.event_schema_version, i.timestamp_ms, i.global_version
                FROM outbox_events e
                JOIN intent_events i ON e.event_id = i.event_id
                WHERE e.published = 0
                ORDER BY i.global_version ASC
                LIMIT 100
            ").unwrap();

            let mut rows = stmt.query([]).unwrap();
            let mut to_publish = Vec::new();
            while let Some(row) = rows.next().unwrap() {
                to_publish.push((
                    row.get::<_, String>(0).unwrap(), // event_id
                    row.get::<_, String>(1).unwrap(), // event_type
                    row.get::<_, String>(2).unwrap(), // payload_json
                    row.get::<_, String>(3).unwrap(), // execution_intent_id
                    row.get::<_, i32>(4).unwrap(),    // version
                    row.get::<_, String>(5).unwrap(), // correlation_id
                    row.get::<_, String>(6).unwrap(), // causation_id
                    row.get::<_, i32>(7).unwrap(),    // event_schema_version
                    row.get::<_, i64>(8).unwrap(),    // timestamp_ms
                    row.get::<_, i64>(9).unwrap(),    // global_version
                ));
            }
            to_publish
        };

        for (event_id, event_type, payload_json, intent_id, version, corr_id, caus_id, schema_v, ts, global_version) in events_to_publish {
            let record = IntentEventRecord {
                event_id: event_id.clone(),
                execution_intent_id: intent_id,
                event_type: event_type.clone(),
                correlation_id: corr_id,
                causation_id: caus_id,
                version,
                event_schema_version: schema_v,
                timestamp_ms: ts,
                payload_json,
                global_version,
            };
            
            let subject = format!("execution.committed.{}", event_type.to_lowercase());
            let payload = serde_json::to_vec(&record).unwrap();
            
            if let Ok(_) = nats_client.publish(subject, payload.into()).await {
                // Confirm publication
                let db_guard = db.lock().unwrap();
                db_guard.execute("UPDATE outbox_events SET published = 1 WHERE event_id = ?", params![event_id]).unwrap();
                println!("OUTBOX: Broadcasted execution.committed.{}", event_type.to_lowercase());
            }
        }

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let addr = "[::1]:50052".parse()?;
    
    // Using a physical file to survive kill -9 and verify Outbox
    let db = Connection::open("intent_registry.db")?;
    LyzerIntentRegistry::init_db(&db)?;

    let db_arc = Arc::new(Mutex::new(db));
    
    // Connect to NATS
    let nats_client = async_nats::connect("nats://localhost:4222").await?;

    // Spawn workers
    tokio::spawn(pending_events_consumer(db_arc.clone(), nats_client.clone()));
    tokio::spawn(outbox_publisher_worker(db_arc.clone(), nats_client.clone()));
    
    let registry = LyzerIntentRegistry {
        db: db_arc,
    };

    println!("Lyzer Intent Registry (Event Store + CCP + Outbox) listening on {}", addr);

    Server::builder()
        .add_service(IntentRegistryServer::new(registry))
        .serve(addr)
        .await?;

    Ok(())
}
