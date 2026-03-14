# Stitch Canonical Matrix

Regra aplicada: manter uma variante canônica (mais completa/recente) por título de tela.

## Core product screens

| Título | Screen ID canônico | Rota local |
|---|---|---|
| Landing Page: InGenium Einstein | `projects/14208087628780676024/screens/eafc3c14e8c34a44ae3ac504d913a1a3` | `/(marketing)` |
| Auth: Login Screen | `projects/14208087628780676024/screens/8549c5bc28e64fd3b7ffb80fbf4d5eb2` | `/(auth)/login` |
| Auth: Cadastro Aluno | `projects/14208087628780676024/screens/e07237ebd52e41d0821984cbaba39ebe` | `/(auth)/cadastro` |
| Dashboard: Home do Aluno | `projects/14208087628780676024/screens/3598d2133deb4963a56c14d07400a6e1` | `/(tabs)/dashboard` |
| Ranking: Leaderboard Geral | `projects/14208087628780676024/screens/bc74b89680e14ab1ace912c9134d07b3` | `/(tabs)/ranking` |
| Olimpíadas: Lista Geral | `projects/14208087628780676024/screens/c617f11a16004d118045d6a3031695bc` | `/(tabs)/olimpiadas` |
| Olimpíadas: Detalhes e Inscrição | `projects/14208087628780676024/screens/40231cab8cc44069a7171c24863a4730` | `/olimpiadas/[id]` |
| Mural: Feed da Comunidade | `projects/14208087628780676024/screens/63046f504b9a4ed79975fc742eff4012` | `/(tabs)/mural` |
| Perfil: Configurações e Conta | `projects/14208087628780676024/screens/607181287f9245ea87e9507a9a61ab00` | `/(tabs)/perfil` |
| Admin: Dashboard de Coordenação | `projects/14208087628780676024/screens/5c9ce966fffb403bac9d3532e3cf6af7` | `/admin` |
| Admin: Gestão de Olimpíadas | `projects/14208087628780676024/screens/c6e2bf903ca2473ea6f59948286631a4` | `/admin/olimpiadas` |
| Admin: Resultados e Pontuação | `projects/14208087628780676024/screens/c2f7a70bee024c4aa6853a7af2ecd752` | `/admin/resultados` |
| Admin: Moderação e Usuários | `projects/14208087628780676024/screens/51c9a85c516d48fc8e1c8d695b652de8` | `/admin/moderacao` |
| Admin: Lab Games | `projects/14208087628780676024/screens/labgames001` | `/admin#lab-games` |
| Admin: Teste dos Lobos | `projects/14208087628780676024/screens/labgames002` | `/admin/lab-games/teste-dos-lobos` |
| Dashboard: Meu Desempenho | `projects/14208087628780676024/screens/ee25c05dc12a43f1b4b3dadd93e8c420` | `/(app)/desempenho` |

## Catalog / auxiliary screens

Todas as telas de Design System, Componentes, Skeletons, Onboarding, Gamificação e variantes auxiliares estão centralizadas em rotas `/(stitch)/*` com mapeamento em `lib/stitch/canonicalScreens.ts`.
