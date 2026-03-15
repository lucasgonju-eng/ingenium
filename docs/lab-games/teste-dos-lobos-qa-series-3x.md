# QA funcional - Teste dos Lobos (todas as séries, 3x)

Data: 2026-03-15

## Escopo

- Validar rodadas para todas as séries: `6º Ano`, `7º Ano`, `8º Ano`, `9º Ano`, `1ª Série`, `2ª Série`, `3ª Série`.
- Executar 3 rodadas por série para o mesmo aluno.
- Confirmar anti-repetição de pergunta por aluno enquanto houver pool disponível.

## Evidência técnica já validada em código

- A seleção de questões no banco usa bloqueio explícito de repetição por aluno em `sql/lab_games_question_bank_runtime.sql` com:
  - `not exists (...) from public.game_question_usage u where u.user_id = v_user_id and u.question_id = q.id`
- O serviço do jogo usa esse RPC em `services/games/wolfQuestionBankService.ts`.

## Matriz de execução (resultado validado em banco)

| Série | Rodada 1 | Rodada 2 | Rodada 3 | Sem repetição? | Observações |
|---|---|---|---|---|---|
| 6º Ano | OK | OK | OK | Sim | 12/12 questões únicas |
| 7º Ano | OK | OK | OK | Sim | 12/12 questões únicas |
| 8º Ano | OK | OK | OK | Sim | 12/12 questões únicas |
| 9º Ano | OK | OK | OK | Sim | 12/12 questões únicas |
| 1ª Série | OK | OK | OK | Sim | 12/12 questões únicas |
| 2ª Série | OK | OK | OK | Sim | 12/12 questões únicas |
| 3ª Série | OK | OK | OK | Sim | 12/12 questões únicas |

## Evidência de execução

- Consulta executada no Supabase com `begin ... rollback` para não deixar resíduos.
- Para cada série, foram feitas 3 chamadas de `pick_wolf_questions_from_bank` (4 perguntas por rodada).
- Resultado por série: `total_rows = 12`, `unique_rows = 12`, `no_repeat = true`.

## Critério de aceite

- Não repetir pergunta para o mesmo aluno entre as 3 rodadas da mesma série, enquanto houver questão elegível.
- Se o pool esgotar, o sistema deve retornar erro controlado de esgotamento (`question_pool_exhausted`) e não repetir silenciosamente.
