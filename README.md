# Checkout PIX — DiagLava (MVP)

Checkout oficial de alta conversão para o infoproduto **DiagLava - Conserto na Palma da Mão**, com cobrança exclusiva via PIX pela **BuckPay**, arquitetura resiliente no **Next.js (App Router)** e design system "Apple Soft".

---

## 🚀 Stack Tecnológica

- **Framework:** Next.js (App Router, Node.js Runtime) + TypeScript (strict)
- **Estilização:** Tailwind CSS (Design System customizado com tokens Apple Soft)
- **Ícones:** Lucide React
- **Validação:** Zod (compartilhada e duplicada cliente/servidor)
- **Persistência:** Interface `TransactionStore` com Upstash Redis (produção) e memória (apenas desenvolvimento local)
- **Gateway de Pagamento:** BuckPay API (integração isolada 100% no servidor)

---

## 🔒 Segurança e Regras Inegociáveis

1. **Zero Segredos no Frontend:** O token da BuckPay reside exclusivamente nas variáveis de ambiente do servidor (`.env`). O navegador nunca se comunica diretamente com o gateway.
2. **Redirecionamento Autenticado:** O redirecionamento pós-pagamento só ocorre após o backend confirmar o status `paid`.
3. **Idempotência Rigorosa:** Chaves de idempotência determinísticas (`${sessionId}_${amount}_${attempt}`) evitam cobranças duplicadas em duplo clique, reenvio ou recarregamento.
4. **Coleta Mínima de Dados:** Coleta estritamente 3 campos (**Nome Completo**, **E-mail**, **Telefone**). **Não coleta CPF**, endereço ou senhas. Nenhum dado fictício é enviado ao gateway.
5. **Rate Limiting & Origin Check:** Proteção contra abusos por IP e validação de origem em requisições de criação.

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```env
# BuckPay Gateway
BUCKPAY_TOKEN=sk_live_e77fe478f994c90fb5951f6c396adfb6
BUCKPAY_BASE_URL=https://api.realtechdev.com.br

# Produto
PRODUCT_NAME=DiagLava - Conserto na Palma da Mão
PRODUCT_PRICE_CENTS=3700
UPSELL_URL=https://esquemasplacas.lovable.app/upsell
PIX_EXPIRY_SECONDS=900

# Persistência Upstash Redis (Necessário em Produção)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

> **Nota:** Em desenvolvimento local, se as variáveis do Upstash não forem preenchidas, o sistema utiliza o `MemoryTransactionStore` automaticamente e emite um aviso no console.

---

## 📦 Como Instalar e Rodar

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Verificar aceitação da BuckPay sem CPF (Probe Script):**
   ```bash
   npm run probe:buckpay
   ```

3. **Iniciar servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse [http://localhost:3000](http://localhost:3000).

4. **Build para Produção:**
   ```bash
   npm run build
   npm run start
   ```

---

## 🎯 Rastreamento de UTMs e Rotas Amigáveis

O checkout captura e preserva os seguintes parâmetros de rastreamento:
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_id`, `utm_term`, `utm_content`, `ref`, `src`, `sck`, `xcod`.

### Formas de entrada:
1. **Query String Direta:**
   `https://checkout.seudominio.com/?utm_source=facebook&utm_campaign=cpc_campanha`
2. **Rota por Slug no Caminho:**
   `https://checkout.seudominio.com/c/facebook/cpc_campanha`
   *(Esta rota redireciona internamente para `/` populando `utm_source` e `utm_campaign` e preservando qualquer outro parâmetro existente na query).*

Os parâmetros são persistidos em `sessionStorage` e repassados na URL de Upsell pós-aprovação do pagamento juntamente com `transaction_id`.

---

## 🛠️ Simulador de Estados (Apenas em Desenvolvimento)

Para validar todos os **11 estados** da interface sem necessidade de pagamentos reais:
- Uma barra flutuante **"DEV SIMULATOR"** fica visível no canto inferior esquerdo da tela em modo de desenvolvimento.
- Ela permite acionar instantaneamente qualquer um dos 11 estados:
  1. *Inicial/Incompleto*
  2. *Digitando (Incompleto)*
  3. *Válido (CTA Ativo)*
  4. *Processando (Spinner)*
  5. *PIX Gerado*
  6. *Código Copiado ✓*
  7. *Aguardando Pagamento*
  8. *Aprovado (Confirmação & Redirect)*
  9. *Expirado (com botão de renovação)*
  10. *Erro de Geração (502)*
  11. *Falha de Conexão (503/504)*

Esta barra é completamente removida em compilações de produção (`NODE_ENV === 'production'`).
