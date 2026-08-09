import re

def update_db_js():
    path = r'lyzer edge/backend/db.js'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        "import { recordSqliteWrite } from '../src/observability/index.js';",
        "import { recordSqliteWrite, recordSystemError } from '../src/observability/index.js';"
    )
    content = content.replace(
        "this.migrationsPromise = runMigrations(this).catch(err => {",
        "this.migrationsPromise = runMigrations(this).catch(err => {\n            recordSystemError('CausalMemoryDB', 'MIGRATION_ERROR');"
    )
    content = content.replace(
        "this.runTTLCleanup().catch(err => {",
        "this.runTTLCleanup().catch(err => {\n                recordSystemError('CausalMemoryDB', 'TTL_CLEANUP_ERROR');"
    )
    content = content.replace(
        "} catch (e) {\n                // Ignore migration errors during database close",
        "} catch (e) {\n                recordSystemError('CausalMemoryDB', 'MIGRATION_ERROR');\n                // Ignore migration errors during database close"
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated db.js')

def update_rgc_js():
    path = r'lyzer edge/backend/riskGatewayClient.js'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        "import { fileURLToPath } from 'url';",
        "import { fileURLToPath } from 'url';\nimport { recordSystemError } from '../src/observability/index.js';"
    )
    content = content.replace(
        "} catch (err) {\n  console.warn('⚠️ [gRPC Client] Failed to load RiskGateway proto: ' + err.message);",
        "} catch (err) {\n  recordSystemError('RiskGatewayClient', 'PROTO_LOAD_ERROR');\n  console.warn('⚠️ [gRPC Client] Failed to load RiskGateway proto: ' + err.message);"
    )
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated riskGatewayClient.js')

def update_server_js():
    path = r'lyzer edge/backend/server.js'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        "import { ExchangeExecution } from './exchangeExecution.js';",
        "import { ExchangeExecution } from './exchangeExecution.js';\nimport { recordSystemError } from '../src/observability/index.js';"
    )
    
    content = re.sub(
        r'\} catch \(err\) \{',
        r'} catch (err) {\n    recordSystemError(\'Server\', \'API_ERROR\');',
        content
    )
    content = re.sub(
        r'\} catch \(e\) \{',
        r'} catch (e) {\n    recordSystemError(\'Server\', \'API_ERROR\');',
        content
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated server.js')

def update_streamEngine_js():
    path = r'lyzer edge/backend/streamEngine.js'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace(
        "import { recordTickReceived, recordTickDuration, recordCsrlDuration, recordCclistEvaluation, recordEcaEvaluation } from \"../src/observability/index.js\";",
        "import { recordTickReceived, recordTickDuration, recordCsrlDuration, recordCclistEvaluation, recordEcaEvaluation, recordSystemError } from \"../src/observability/index.js\";"
    )
    
    # Update the specific catch in streamEngine.js
    content = content.replace(
        "        try {\n          await this.processCandle(candle, this.candles.length - 1);\n        } catch (e) {\n          console.error('[STREAM] Error in processCandle:', e);\n        }",
        "        try {\n          const processStartTime = performance.now();\n          await this.processCandle(candle, this.candles.length - 1);\n          recordTickDuration(this.symbol, 'SUCCESS', (performance.now() - processStartTime) / 1000);\n        } catch (e) {\n          recordSystemError('StreamEngine', 'PROCESS_CANDLE_ERROR');\n          recordTickDuration(this.symbol, 'FAIL', (performance.now() - processStartTime) / 1000); // Assume processStartTime is defined at the top of processCandle\n          console.error('[STREAM] Error in processCandle:', e);\n        }"
    )
    
    content = content.replace(
        "    } catch (csrlErr) {",
        "    } catch (csrlErr) {\n      recordSystemError('StreamEngine', 'CSRL_ERROR');"
    )
    content = content.replace(
        "    } catch (grpcErr) {",
        "    } catch (grpcErr) {\n          recordSystemError('StreamEngine', 'GRPC_ERROR');"
    )
    content = content.replace(
        "    } catch (e) {\n      console.error('[STREAM] Order placement failed:', e.message);",
        "    } catch (e) {\n      recordSystemError('StreamEngine', 'EXECUTION_ERROR');\n      console.error('[STREAM] Order placement failed:', e.message);"
    )
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated streamEngine.js')

update_db_js()
update_rgc_js()
update_server_js()
update_streamEngine_js()
