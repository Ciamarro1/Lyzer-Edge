pub mod governance {
    pub mod cvp {
        tonic::include_proto!("lyzer.governance.cvp");
    }
    pub mod eca {
        tonic::include_proto!("lyzer.governance.eca");
    }
    pub mod rio {
        tonic::include_proto!("lyzer.governance.rio");
    }
    pub mod cml {
        tonic::include_proto!("lyzer.governance.cml");
    }
}
