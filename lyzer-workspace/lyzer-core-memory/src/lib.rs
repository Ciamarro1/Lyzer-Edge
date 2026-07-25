use lyzer_core_models::*;

/// Constitutional Event Repository (CER)
/// Enforces Axiom 6: Memory is Non-Destructive.
/// No delete or update methods exist.
pub struct ConstitutionalMemory {
    pub authorized_records: Vec<AuthorizedMeaningRecord>,
    pub rejected_records: Vec<RejectedMeaningRecord>,
    pub contested_records: Vec<ContestedMeaningRecord>,
}

impl ConstitutionalMemory {
    pub fn new() -> Self {
        Self {
            authorized_records: Vec::new(),
            rejected_records: Vec::new(),
            contested_records: Vec::new(),
        }
    }

    pub fn insert_authorized(&mut self, record: AuthorizedMeaningRecord) {
        self.authorized_records.push(record);
    }

    pub fn insert_rejected(&mut self, record: RejectedMeaningRecord) {
        self.rejected_records.push(record);
    }

    pub fn insert_contested(&mut self, record: ContestedMeaningRecord) {
        self.contested_records.push(record);
    }
}
