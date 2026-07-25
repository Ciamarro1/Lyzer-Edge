fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("cargo:rerun-if-changed=../../src-ts/governance/protos/");

    tonic_build::configure()
        .build_server(true)
        .build_client(true)
        .compile_protos(
            &[
                "../../src-ts/governance/protos/eca_jurisdiction.proto",
                "../../src-ts/governance/protos/rio_telemetry.proto",
                "../../src-ts/governance/protos/cml_ledger.proto",
                "../../src-ts/governance/protos/proto_version.proto",
            ],
            &["../../src-ts/governance/protos/"],
        )?;

    Ok(())
}
