# BI Admin Web

## Objetivo
Este documento explica, de forma operacional, como o novo BI do admin foi montado, quais arquivos foram alterados, de onde os dados saem e como diagnosticar problemas rapidamente.

## O que foi entregue
- Nova aba `BI` no painel admin.
- Resumo executivo do BI dentro da aba `Visão geral`.
- Filtros por período, segmento (`Fundamental` e `Médio`) e série.
- Gráficos visuais com `react-native-svg`.
- Linha do tempo do XP em barras verticais.
- Gráfico vertical dos maiores pontuadores.
- Ranking institucional filtrável por geral, Fundamental, Médio e série.
- Atualização automática do BI após novos lançamentos de XP feitos na aba de lançamento.

## Arquivos alterados
- `app/admin/index.tsx`
  - adiciona a aba `BI`;
  - carrega o snapshot analítico do BI;
  - renderiza o resumo do BI dentro da `Visão geral`;
  - renderiza a aba `BI`;
  - atualiza o BI após mudanças na aba `Lançamento de XP`.
- `components/admin/AdminCoreDashboard.tsx`
  - ganhou a prop `dashboardExtra`;
  - permite injetar o resumo executivo do BI na `Visão geral`.
- `components/sections/admin/AdminBiSection.tsx`
  - novo componente central do BI;
  - concentra filtros, KPIs, gráficos e ranking.
- `components/sections/admin/AdminXpLaunchSection.tsx`
  - ganhou a prop opcional `onDataChanged`;
  - notifica o painel admin quando há alteração de lançamentos.
- `lib/supabase/queries.ts`
  - ganhou o tipo `AdminBiSnapshot`;
  - ganhou a função `fetchAdminBiSnapshot()`.
- `package.json`
  - adiciona `react-native-svg`.

## Origem dos dados

### 1. Lançamentos administrativos de XP
Fonte principal:
- `xp_activity_awards`

Leitura no app:
- `listXpActivityAwardsAdminFiltered()`
- `fetchAdminBiSnapshot()`

Uso no BI:
- XP lançado
- alunos impactados
- lotes enviados
- média por aluno
- média por lote
- distribuição por série
- distribuição Fundamental x Médio
- atividades com mais XP
- operadores que mais lançaram XP
- evolução diária dos lançamentos

### 2. Ranking institucional
Fonte principal:
- ranking já retornado por `get_registered_students_ranking_admin`

Leitura no app:
- `fetchRankingAllRegisteredStudents()`

Uso no BI:
- ranking geral
- ranking Fundamental
- ranking Médio
- ranking por série
- gráfico vertical dos maiores pontuadores

Importante:
- o ranking institucional não é o mesmo conceito de "XP administrativo puro";
- ele continua seguindo a pontuação institucional já calculada pelo sistema.

### 3. Cadastro base dos alunos
Fonte principal:
- `profiles` por meio de `get_registered_students_full_admin`

Leitura no app:
- `fetchRegisteredStudentsFull()`

Uso no BI:
- normalização das séries
- apoio visual aos filtros
- consistência entre alunos cadastrados e alunos impactados

## Regra de negócio usada no BI

### Segmentação Fundamental x Médio
O BI deriva o segmento principalmente pela série:
- `6º Ano`, `7º Ano`, `8º Ano` => `Fundamental`
- `9º Ano`, `1ª Série`, `2ª Série`, `3ª Série` => `Médio`

Se a série não vier corretamente em algum award, o componente usa o `target_group` do lançamento como fallback.

### Período
Os filtros de período olham para:
- `occurred_on`

Isso significa que o BI acompanha a data da atividade, e não apenas a data de criação técnica do registro.

## Como o fluxo funciona
1. O `admin/index.tsx` carrega alunos, ranking e o snapshot do BI.
2. O resumo do BI aparece dentro de `Visão geral`.
3. A aba `BI` consome os mesmos dados carregados no painel.
4. Quando a aba `Lançamento de XP` cria, edita ou remove dados, ela dispara `onDataChanged`.
5. O painel então recarrega:
   - alunos/ranking
   - snapshot do BI

## Diagnóstico rápido

### Problema: a aba `BI` não aparece
Verifique:
- se `app/admin/index.tsx` ainda contém a chave `bi` em `AdminTab`;
- se a aba `BI` continua em `ADMIN_TABS`;
- se o componente `AdminBiSection` continua importado corretamente.

### Problema: o resumo da `Visão geral` sumiu
Verifique:
- se `AdminCoreDashboard.tsx` ainda aceita a prop `dashboardExtra`;
- se `app/admin/index.tsx` continua passando `dashboardExtra` no bloco `activeTab === "dashboard"`.

### Problema: o BI mostra erro ao carregar
Verifique:
- se `fetchAdminBiSnapshot()` existe em `lib/supabase/queries.ts`;
- se `listXpActivityAwardsAdminFiltered()` continua funcionando;
- se houve erro de autenticação/permissão na leitura do RPC de histórico.

Teste manual recomendado:
1. abrir o admin;
2. abrir a aba `BI`;
3. clicar em `Tentar novamente`;
4. conferir se o erro persiste.

### Problema: números do BI não batem com o ranking
Isso pode ser esperado.

Motivo:
- o BI usa `xp_activity_awards` para métricas de lançamento administrativo;
- o ranking usa a pontuação institucional já consolidada do sistema.

Se precisar validar:
1. compare o volume do BI com histórico/log de lançamentos;
2. compare o ranking apenas com o ranking institucional do sistema;
3. não misture esses dois conceitos na mesma validação.

### Problema: o BI não atualiza depois de um lançamento novo
Verifique:
- se `AdminXpLaunchSection.tsx` ainda recebe `onDataChanged`;
- se `refreshAfterChange()` ainda chama `onDataChanged?.()`;
- se `app/admin/index.tsx` continua recarregando `reloadStudentsAndRanking()` e `reloadBiData()`.

## Como desativar ou isolar o BI, se der problema

### Opção 1. Remover só a aba `BI`
Arquivo:
- `app/admin/index.tsx`

Ação:
- remover a chave `{ key: "bi", label: "BI" }` de `ADMIN_TABS`;
- remover o bloco que renderiza `<AdminBiSection ... />`.

### Opção 2. Manter a aba, mas remover o resumo da `Visão geral`
Arquivos:
- `app/admin/index.tsx`
- `components/admin/AdminCoreDashboard.tsx`

Ação:
- parar de passar `dashboardExtra`;
- ou deixar `dashboardExtra={null}`.

### Opção 3. Manter a UI e desligar a atualização automática
Arquivos:
- `app/admin/index.tsx`
- `components/sections/admin/AdminXpLaunchSection.tsx`

Ação:
- remover o `onDataChanged` da renderização;
- ou remover a chamada `onDataChanged?.()` dentro de `refreshAfterChange()`.

## Dependência adicionada
- `react-native-svg`

Motivo:
- desenhar gráficos de forma compatível com o stack `React Native + Expo + Web` do projeto, sem acoplar o admin a uma biblioteca gráfica mais pesada.

## Verificação sugerida após mudanças futuras
1. Abrir `Visão geral` e conferir o resumo do BI.
2. Abrir a aba `BI` e testar:
   - período;
   - segmento;
   - série;
   - ranking.
3. Fazer um lançamento novo em `Lançamento de XP`.
4. Voltar para a aba `BI` e confirmar atualização.
5. Conferir se os números do BI continuam coerentes com o log de envios.
