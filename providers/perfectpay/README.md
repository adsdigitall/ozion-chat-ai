# Perfect Pay Provider

## Configuração
Configure via Admin Master > Integrações

## Uso
```typescript
import { client } from './client.js';
import { testConnection } from './testConnection.js';

await client.connect({ apiKey: 'your-key' });
const result = await testConnection('your-key');
```

## API
- `client.connect()` - Conectar ao provider
- `client.disconnect()` - Desconectar
- `testConnection()` - Testar conexão
- `webhooks.handle()` - Processar webhook
- `logger.log()` - Registrar log
