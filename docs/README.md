# FacePhoto — Documentação do Projeto

**Versão:** 1.0 · **Data:** 25/07/2026

> Encontre qualquer pessoa em suas fotos, de forma simples e privada.

---

## Índice de Documentos

| # | Documento | Agente | Descrição |
|---|---|---|---|
| 01 | [Visão do Produto](./01_visao_produto.md) | @PO | Propósito, público-alvo, proposta de valor e roadmap |
| 02 | [Requisitos Funcionais](./02_requisitos_funcionais.md) | @Analista | Lista completa de RF com critérios de aceite |
| 03 | [Requisitos Não Funcionais](./03_requisitos_nao_funcionais.md) | @Analista + @Arquiteto | Desempenho, privacidade, usabilidade, portabilidade |
| 04 | [Casos de Uso](./04_casos_de_uso.md) | @Analista | Fluxos detalhados dos cenários principais |
| 05 | [Arquitetura](./05_arquitetura.md) | @Arquiteto | Camadas, módulos, fluxo de dados e decisões técnicas |
| 06 | [Fluxo de Telas](./06_fluxo_de_telas.md) | @UIUX | Navegação, wireframes, design tokens e componentes |
| 07 | [Stack Tecnológico](./07_stack_tecnologico.md) | @Arquiteto | Tecnologias escolhidas com justificativas |
| 08 | [Modelo de Dados](./08_modelo_de_dados.md) | @Arquiteto | Schema SQLite, ERD e queries principais |
| 09 | [Plano de Testes](./09_plano_de_testes.md) | @QA | Testes unitários, integração, performance e precisão |

---

## Resumo Executivo

O **FacePhoto** é um software desktop multiplataforma (Windows, macOS, Linux) que permite
encontrar, dentro de um acervo de fotos, todas as imagens em que uma pessoa específica aparece
— usando fotos de referência como base. O processamento é 100% local e offline.

### Decisões principais confirmadas

| Decisão | Escolha |
|---|---|
| Interface | App desktop instalável (Tauri + React) |
| Motor de IA v1.0 | DeepFace (ArcFace + RetinaFace) |
| Motor de IA v1.1+ | InsightFace (ONNX) |
| Banco de dados | SQLite local |
| Plataformas | Windows, macOS, Linux |
| Privacidade | 100% offline, sem nenhum dado externo |

---

## Status da Documentação

- [x] 01 — Visão do Produto
- [x] 02 — Requisitos Funcionais
- [x] 03 — Requisitos Não Funcionais
- [x] 04 — Casos de Uso
- [x] 05 — Arquitetura
- [x] 06 — Fluxo de Telas
- [x] 07 — Stack Tecnológico
- [x] 08 — Modelo de Dados
- [x] 09 — Plano de Testes
- [ ] **Aprovação do cliente** ← *etapa atual*
- [ ] Início da implementação

---

*Documentação elaborada pela equipe de agentes: @PO · @Analista · @Arquiteto · @UIUX · @QA*
