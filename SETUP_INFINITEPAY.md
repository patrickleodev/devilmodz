# Integração InfinitePay

Este projeto foi migrado de **Mercado Pago** para **InfinitePay** como gateway de pagamentos.

## Configuração Inicial

### 1. Obtenha suas credenciais InfinitePay

1. Acesse [InfinitePay Dashboard](https://dashboard.infinitepay.io)
2. Crie uma conta (se ainda não tiver)
3. Navegue para "API Keys" ou "Configurações"
4. Copie:
   - **API Key** (chave de autenticação da API)
   - **Client ID** (identificador do seu cliente)

### 2. Configure as variáveis de ambiente

#### Para desenvolvimento (`.env.local`):

```env
INFINITEPAY_API_KEY=your_api_key_here
INFINITEPAY_CLIENT_ID=your_client_id_here
INFINITEPAY_MODE=sandbox
```

#### Para produção (`.env.production.local`):

```env
INFINITEPAY_API_KEY=your_production_api_key_here
INFINITEPAY_CLIENT_ID=your_production_client_id_here
INFINITEPAY_MODE=production
```

### 3. Webhooks

Configure os webhooks no Dashboard do InfinitePay para apontar para:

```
https://seu-dominio.com/api/payments/infinitepay/webhook
```

**Eventos a configurar:**
- `payment.approved` - Pagamento aprovado
- `payment.pending` - Pagamento pendente
- `payment.declined` - Pagamento recusado
- `payment.cancelled` - Pagamento cancelado

## Estrutura da Integração

### Arquivos Principais

- **`src/lib/infinitepay.ts`** - Funções da API do InfinitePay
  - `createInfinitePayCheckout()` - Criar sessão de checkout
  - `fetchInfinitePayTransaction()` - Buscar status de transação
  - `refundInfinitePayTransaction()` - Processar reembolso

- **`src/pages/api/payments/infinitepay/checkout.ts`** - Endpoint de criação de pedido
  - Cria ordem no banco de dados
  - Gera sessão de checkout no InfinitePay
  - Envia notificação no Discord

- **`src/pages/api/payments/infinitepay/webhook.ts`** - Endpoint de webhook
  - Recebe notificações de pagamento
  - Atualiza status do pedido
  - Notifica no Discord sobre confirmação

## Fluxo de Pagamento

1. **Cliente clica em "Comprar Agora"**
   - POST `/api/payments/infinitepay/checkout`
   - Cria Order (status: pending)
   - Retorna URL de checkout do InfinitePay

2. **Cliente é redirecionado para InfinitePay**
   - Seleciona método de pagamento
   - Completa transação

3. **InfinitePay retorna ao site**
   - Sucesso: `/?payment=success`
   - Cancelado: `/?payment=cancel`
   - Pendente: `/?payment=pending`

4. **Webhook recebe confirmação**
   - POST `/api/payments/infinitepay/webhook`
   - Atualiza Order (status: completed)
   - Envia notificação no Discord

## Status de Pagamento

O webhook mapeia status do InfinitePay para status interno:

| InfinitePay | Sistema |
|-------------|---------|
| `approved` | completed |
| `confirmed` | completed |
| `paid` | completed |
| `pending` | pending |
| `declined` | canceled |
| `failed` | canceled |
| `cancelled` | canceled |

## Testando em Sandbox

1. Use cartões de teste fornecidos pelo InfinitePay
2. Verifique logs no Dashboard
3. Confirme que webhooks estão sendo recebidos

## Migração de Mercado Pago

Se você estava usando Mercado Pago antes:

- Endpoints antigos `/api/payments/mercadopago/*` ainda existem mas **NÃO são utilizados**
- Página de planos agora aponta para `/api/payments/infinitepay/checkout`
- As credenciais de Mercado Pago foram removidas do `.env`

## Troubleshooting

### "INFINITEPAY_API_KEY is not configured"
- Verifique se as variáveis de ambiente foram definidas corretamente
- Reinicie o servidor de desenvolvimento: `npm run dev`

### Webhook não está recebendo notificações
- Confirme a URL no Dashboard do InfinitePay
- Verifique se o servidor está acessível externamente (use ngrok em desenvolvimento)
- Consulte os logs do Dashboard do InfinitePay

### "Invalid amount" no checkout
- Valores são sempre em centavos (multiplicado por 100)
- Isso é feito automaticamente pela função `createInfinitePayCheckout()`

## Suporte

Para problemas com a integração InfinitePay:
- Documentação: https://docs.infinitepay.io
- Suporte: support@infinitepay.io
