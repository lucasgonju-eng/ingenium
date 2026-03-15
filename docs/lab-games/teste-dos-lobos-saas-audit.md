# Auditoria SaaS de XP - Teste dos Lobos

Data: 2026-03-15

## Status geral

- Automação por eventos: **OK**
- Job agendado dedicado (cron/worker): **NÃO**
- Integração direta do jogo com persistência de tentativa: **OK (aplicada nesta entrega)**
- Status final para go-live de hoje: **OK com ressalvas**

## O que foi validado

- O webhook de pagamento (`hostinger/asaas-webhook.php`) credita XP de Plano Pro e força recálculo de pontos.
- O recálculo de pontos também ocorre por trigger/RPC no banco (fluxo baseado em eventos, sem cron central).
- O jogo agora persiste tentativas via RPC (`upsert_wolf_attempt_result`) no fim da rodada, permitindo histórico real de tentativas.
- Foi criado gate server-side (`get_wolf_attempt_gate`) para devolver consumo diário, limite efetivo e cooldown.

## Gaps identificados

- Não existe worker/cron dedicado para reprocessamento periódico de XP (somente eventos e chamadas pontuais).
- Ainda não há pipeline assíncrona para reconciliação em lote (casos de falha externa prolongada).

## Mitigação de lançamento (hoje)

- Manter monitoramento do webhook de pagamento e logs de erro no Hostinger.
- Em caso de falha pontual de crédito de XP, usar recálculo via RPC para correção rápida.
- Validar após publicação:
  - criação de tentativa em `game_attempts`;
  - atualização de pontos do aluno no dashboard.
