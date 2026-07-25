import { connect } from 'nats';
async function run() {
    const nc = await connect({ servers: "nats://localhost:4222" });
    const jsm = await nc.jetstreamManager();
    const streams = await jsm.streams.list().next();
    for (const s of streams) {
        console.log(`Stream: ${s.config.name}, Subjects: ${s.config.subjects.join(', ')}`);
    }
    await nc.close();
}
run();
