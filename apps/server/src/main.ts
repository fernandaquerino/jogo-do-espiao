import { Logger } from '@nestjs/common'
import { createApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig()
const app = await createApp(config)
await app.listen(config.port, '0.0.0.0')
new Logger('Bootstrap').log(`Server listening on port ${config.port}`)
