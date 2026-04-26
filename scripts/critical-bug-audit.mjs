import { execSync } from "node:child_process";

const {
  OPENAI_API_KEY,
  SLACK_WEBHOOK_URL,
  OPENAI_MODEL = "gpt-5-mini",
  REPO_NAME = "unknown-repo",
  BRANCH_NAME = "unknown-branch",
  GITHUB_SHA = "unknown-sha",
  GITHUB_RUN_URL = "",
} = process.env;

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY");
}

if (!SLACK_WEBHOOK_URL) {
  throw new Error("Missing SLACK_WEBHOOK_URL");
}

function sh(command) {
  try {
    return execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 30 * 1024 * 1024,
    }).trim();
  } catch {
    return "";
  }
}

function truncate(text, maxChars) {
  if (!text) return "";
  if (text.length <= maxChars) return text;

  return (
    text.slice(0, maxChars) +
    "\n\n[TRUNCADO: o diff ficou grande demais. Analise apenas a parte visível e mencione que o diff foi truncado.]"
  );
}

function stripHugeOrNoisyFiles(diffText) {
  const noisyPatterns = [
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "bun.lockb",
    ".min.js",
    ".map",
    "dist/",
    "build/",
    ".expo/",
    "node_modules/",
  ];

  const chunks = diffText.split("\ndiff --git ");

  const kept = chunks.filter((chunk, index) => {
    if (index === 0 && !chunk.startsWith("a/")) return true;

    const normalized = chunk.toLowerCase();

    return !noisyPatterns.some((pattern) =>
      normalized.includes(pattern.toLowerCase())
    );
  });

  return kept.join("\ndiff --git ");
}

async function postToSlack(text) {
  const safeText = truncate(text, 35000);

  const response = await fetch(SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: safeText,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Slack webhook failed: ${response.status} ${body}`);
  }
}

async function callOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: prompt,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI API failed: ${response.status} ${body}`);
  }

  const data = await response.json();

  if (data.output_text) {
    return data.output_text;
  }

  const parts = [];

  for (const item of data.output || []) {
    if (item.type === "message") {
      for (const content of item.content || []) {
        if (content.type === "output_text" && content.text) {
          parts.push(content.text);
        }
      }
    }
  }

  return parts.join("\n").trim() || "Nenhuma resposta textual retornada pelo modelo.";
}

const commits = sh(
  `git log --since="24 hours ago" --pretty=format:"%h | %an | %ad | %s" --date=iso --no-merges`
);

if (!commits) {
  await postToSlack(
    `✅ *Critical Bug Audit — ${REPO_NAME}*\n\nNenhum commit novo nas últimas 24h.\n\n*Branch:* \`${BRANCH_NAME}\`\n*Run:* ${GITHUB_RUN_URL}`
  );
  process.exit(0);
}

let baseCommit = sh(`git rev-list -n 1 --before="24 hours ago" HEAD`);

if (!baseCommit) {
  baseCommit = sh(`git rev-list --max-parents=0 HEAD`);
}

const changedFiles = sh(`git diff --name-only ${baseCommit}..HEAD`);
const rawDiff = sh(`git diff --no-ext-diff --unified=80 ${baseCommit}..HEAD`);
const filteredDiff = stripHugeOrNoisyFiles(rawDiff);
const safeDiff = truncate(filteredDiff, 70000);

const prompt = `
Você é um engenheiro sênior especialista em auditoria de bugs críticos em SaaS.

Repositório: ${REPO_NAME}
Branch: ${BRANCH_NAME}
SHA atual: ${GITHUB_SHA}

Sua tarefa:
Analise os commits recentes e o diff abaixo. Procure SOMENTE bugs de alta severidade.

Foque em:
- perda de dados
- falhas de autenticação
- bypass de autorização/permissão
- falhas de pagamento
- vazamento de privacidade ou segurança
- crashes
- onboarding quebrado
- quebra grave para usuário final
- mutações perigosas de estado
- suposições erradas em produção
- race conditions
- erros null/undefined em caminhos críticos
- bugs em envio de e-mail, login, cadastro, formulário ou fluxo financeiro

Não reporte:
- estilo de código
- nomes de variáveis
- pequenas melhorias de UX
- sugestões especulativas sem cenário concreto
- refactors amplos
- problemas que não tenham impacto real no usuário ou negócio

Regras:
- Esta é uma auditoria somente leitura.
- Não sugira mexer em dados de produção.
- Não sugira migrations automáticas.
- Se uma migration parecer necessária, marque como "revisão manual obrigatória".
- Se não houver bug crítico real, diga claramente que nenhum bug crítico foi encontrado.
- Seja direto. Evite alarmismo.

Responda em português, formatado para Slack.

Use esta estrutura:

1. Veredito:
"✅ Nenhum bug crítico encontrado"
ou
"🚨 Possível bug crítico encontrado"

2. Resumo executivo:
Explique em poucas linhas.

3. Achados:
Para cada problema real:
- Severidade
- Cenário concreto que dispara o bug
- Impacto para usuário/negócio
- Causa raiz
- Arquivos envolvidos
- Correção mínima segura
- Como validar/testar

4. Confiança:
Alta / Média / Baixa

5. Próxima ação recomendada:
Diga exatamente o que eu deveria fazer.

Commits recentes:
${commits}

Arquivos alterados:
${changedFiles}

Diff:
${safeDiff}
`;

const analysis = await callOpenAI(prompt);

const slackMessage = `
*Critical Bug Audit — ${REPO_NAME}*

*Branch:* \`${BRANCH_NAME}\`
*Período analisado:* últimas 24h
*Run:* ${GITHUB_RUN_URL}

${analysis}
`;

await postToSlack(slackMessage);
