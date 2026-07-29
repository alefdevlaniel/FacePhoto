# 06 — Fluxo de Telas (UX/UI)

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @UIUX

---

## 1. Princípios de Design

| Princípio | Descrição |
|---|---|
| **Clareza** | Cada tela tem um único objetivo principal — sem sobrecarga cognitiva |
| **Orientação** | O usuário sempre sabe onde está e o que fazer a seguir |
| **Feedback** | Toda ação gera resposta visual imediata |
| **Segurança** | Ações destrutivas (copiar/sobrescrever) exigem confirmação explícita |
| **Acessibilidade** | Contraste WCAG AA, navegação por teclado, labels descritivos |
| **Modernidade** | Visual limpo, dark mode como padrão, animações sutis |

---

## 2. Mapa de Navegação

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAPA DE TELAS                                │
│                                                                     │
│  [T01 - Boas-Vindas]  ──→  [T02 - Home / Histórico]                │
│        (1ª vez)                     │                               │
│                                     ├── "Nova Busca" ──→ [T03]     │
│                                     └── "Ver Sessão"  ──→ [T05]    │
│                                                                     │
│  [T03 - Configurar Busca]                                           │
│    → Adicionar referências                                          │
│    → Selecionar pastas                                              │
│    → Ajustar threshold                                              │
│    → "Iniciar Análise" ──→ [T04]                                    │
│                                                                     │
│  [T04 - Processamento]                                              │
│    → Progresso em tempo real                                        │
│    → Log ao vivo                                                    │
│    → [Cancelar] ──→ [T05 com resultados parciais]                  │
│    → Concluído ──→ [T05]                                            │
│                                                                     │
│  [T05 - Resultados]                                                 │
│    → Grade de fotos confirmadas                                     │
│    → Aba: Revisão Manual                                            │
│    → Seleção de fotos                                               │
│    → [Copiar Selecionadas] ──→ [T06]                                │
│                                                                     │
│    → Clique em foto ──→ [T05b - Visualizador]                       │
│                                                                     │
│  [T06 - Relatório Final]                                            │
│    → Resumo da sessão                                               │
│    → [Abrir Pasta] | [Nova Busca] | [Voltar ao Início]             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Especificação de Cada Tela

---

### T01 — Boas-Vindas (Onboarding — apenas na 1ª execução)

**Objetivo:** Apresentar o produto e orientar o usuário na primeira utilização.

**Elementos:**
```
┌─────────────────────────────────────────┐
│                                         │
│        🔍  FacePhoto                    │
│                                         │
│  Encontre qualquer pessoa em suas       │
│  fotos de forma simples e privada.      │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  ①  Adicione fotos de referência  │  │
│  │  ②  Selecione seu acervo de fotos │  │
│  │  ③  Revise e copie os resultados  │  │
│  └───────────────────────────────────┘  │
│                                         │
│       [  Começar agora →  ]             │
│            Pular tour                   │
└─────────────────────────────────────────┘
```

**Comportamento:**
- Exibida apenas na primeira abertura do app
- Animação suave de entrada
- "Pular tour" vai diretamente para T02

---

### T02 — Home / Histórico

**Objetivo:** Ponto de entrada principal. Permite iniciar nova busca ou retomar sessão anterior.

**Elementos:**
```
┌─────────────────────────────────────────────────────┐
│  FacePhoto                           [⚙ Config]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│    [+  Nova Busca]                                  │
│                                                     │
│  ─────────────────── Buscas Recentes ─────────────  │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 Vó Maria                                  │   │
│  │    HD Externo/Fotos Família  •  24/07/2026   │   │
│  │    38 fotos encontradas  •  35 copiadas      │   │
│  │                              [Ver Resultados]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ 👤 Tio João                                  │   │
│  │    D:/Fotos  •  20/07/2026                   │   │
│  │    22 fotos encontradas  •  22 copiadas      │   │
│  │                              [Ver Resultados]│   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

### T03 — Configurar Busca

**Objetivo:** O usuário define QUEM buscar, ONDE buscar e ONDE salvar.

**Elementos:**
```
┌──────────────────────────────────────────────────────────┐
│  ← Voltar          Nova Busca                            │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  QUEM VOCÊ QUER ENCONTRAR?                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Nome: [________________________]                  │  │
│  │                                                    │  │
│  │  Fotos de referência:                              │  │
│  │  ┌────────┐ ┌────────┐ ┌─────────────────────┐    │  │
│  │  │  foto  │ │  foto  │ │  + Adicionar foto   │    │  │
│  │  │  [✕]   │ │  [✕]   │ │  (arraste ou clique)│    │  │
│  │  └────────┘ └────────┘ └─────────────────────┘    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  [+ Adicionar outra pessoa]                              │
│                                                          │
│  ONDE ESTÃO SUAS FOTOS?                                  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📁  D:\HD_Externo\Fotos Família\          [Trocar]│  │
│  │  (inclui subpastas automaticamente)                │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ONDE SALVAR AS ENCONTRADAS?                             │
│  ┌────────────────────────────────────────────────────┐  │
│  │  📁  C:\Users\João\Desktop\Fotos Vó\      [Trocar]│  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  CONFIGURAÇÕES AVANÇADAS  [▼ expandir]                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Sensibilidade:  Permissivo ●──────────── Restrito │  │
│  │                             60%                    │  │
│  │  ☐  Criar subpastas por pessoa no destino          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│             [  Iniciar Análise →  ]                      │
└──────────────────────────────────────────────────────────┘
```

**Validações (exibidas inline antes de permitir "Iniciar"):**
- Nome preenchido
- Ao menos 1 foto de referência com rosto detectável
- Pasta de origem selecionada
- Pasta de destino diferente da origem

---

### T04 — Processamento

**Objetivo:** Exibir o progresso em tempo real. O usuário acompanha sem poder fazer nada exceto cancelar.

**Elementos:**
```
┌──────────────────────────────────────────────────────────┐
│               Analisando suas fotos...                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Processando com: GPU NVIDIA GeForce RTX 3060           │
│                                                          │
│  ████████████████████░░░░░░░░░░░░  63%                  │
│  532 de 847 fotos analisadas                             │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Fase atual:  ● Reconhecimento facial             │   │
│  │  Tempo decorrido:  2m 14s                         │   │
│  │  Tempo estimado:   1m 20s restantes               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Resultados até agora:                            │   │
│  │  ✓  Vó Maria:   21 fotos encontradas             │   │
│  │  ⚠  Revisão manual: 4                            │   │
│  │  ⊘  Duplicatas ignoradas: 23                     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Log ao vivo:                                            │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [14:32:01] Analisando: IMG_4521.jpg             │   │
│  │  [14:32:02] ✓ Match encontrado (89%) - Vó Maria  │   │
│  │  [14:32:03] Analisando: IMG_4522.jpg             │   │
│  │  [14:32:03] ✗ Sem match                          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│              [  ✕ Cancelar  ]                            │
└──────────────────────────────────────────────────────────┘
```

---

### T05 — Resultados

**Objetivo:** Exibir as fotos encontradas para revisão. O usuário seleciona o que copiar.

**Elementos:**
```
┌──────────────────────────────────────────────────────────────┐
│  ← Voltar   Resultados: Vó Maria              [Nova Busca]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  [✓ Confirmadas (34)]  [⚠ Revisão Manual (8)]               │
│                                                              │
│  [☑ Selecionar Tudo]  [☐ Desmarcar Tudo]                    │
│                                   34 selecionadas           │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│  │ foto1 │ │ foto2 │ │ foto3 │ │ foto4 │ │ foto5 │         │
│  │  ☑   │ │  ☑   │ │  ☑   │ │  ☑   │ │  ☑   │         │
│  │  94% │ │  91% │ │  87% │ │  83% │ │  79% │         │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘         │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐         │
│  │ foto6 │ │ foto7 │ │ foto8 │ │ foto9 │ │foto10 │         │
│  │  ☑   │ │  ☑   │ │  ☑   │ │  ☐   │ │  ☑   │         │
│  │  78% │ │  76% │ │  74% │ │  71% │ │  69% │         │
│  └───────┘ └───────┘ └───────┘ └───────┘ └───────┘         │
│                                                              │
│         [  Copiar 33 fotos selecionadas →  ]                │
└──────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Score exibido em cada miniatura com cor (verde → amarelo conforme score cai)
- Clique na miniatura abre T05b (visualizador)
- Clique no checkbox seleciona/deseleciona
- Botão de cópia só ativa com ao menos 1 selecionada

---

### T05b — Visualizador de Foto

**Objetivo:** Ver a foto completa com o rosto destacado. Confirmar ou rejeitar individualmente.

**Elementos:**
```
┌────────────────────────────────────────────────────────────────┐
│  ✕  Fechar                  ← Anterior   Próxima →            │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────────────────────────────────────────────┐    │
│   │                                                      │    │
│   │          [foto em tamanho real]                      │    │
│   │                                                      │    │
│   │   ┌──────────────────┐  ← retângulo verde           │    │
│   │   │  rosto destacado │     ao redor do rosto         │    │
│   │   └──────────────────┘                              │    │
│   │                                                      │    │
│   └──────────────────────────────────────────────────────┘    │
│                                                                │
│  Arquivo:  IMG_4521.jpg                                        │
│  Caminho:  D:\Fotos Família\2019\Natal\IMG_4521.jpg           │
│  Confiança: ████████████████░░░  89%   Vó Maria               │
│  Data da foto: 25/12/2019                                      │
│  Câmera: Apple iPhone 11                                       │
│                                                                │
│            [☐ Desmarcar]        [☑ Manter selecionada]        │
└────────────────────────────────────────────────────────────────┘
```

---

### T06 — Relatório Final

**Objetivo:** Confirmar que tudo foi feito com sucesso e oferecer próximos passos.

**Elementos:**
```
┌──────────────────────────────────────────────────────────┐
│                   Busca Concluída!  ✓                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Resumo da sessão                                 │   │
│  │                                                   │   │
│  │  Pessoa buscada:   Vó Maria                       │   │
│  │  Fotos analisadas: 847                            │   │
│  │  Duplicatas ign.:  23                             │   │
│  │  Fotos encontradas: 34                            │   │
│  │  Fotos copiadas:   33                             │   │
│  │  Revisão manual:   8 (4 confirmadas, 4 rejeitadas)│   │
│  │  Tempo total:      3min 42seg                     │   │
│  │  Pasta de destino: C:\Users\João\Fotos Vó\        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│     [  📁 Abrir Pasta de Destino  ]                      │
│                                                          │
│     [  + Nova Busca  ]    [  🏠 Início  ]               │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Sistema Visual (Design Tokens)

### Paleta de Cores & Temas

O FacePhoto oferece **suporte a 3 modos de tema**: **Escuro (Dark)**, **Claro (Light)** e **Sistema (Auto)**, todos harmonizados com as cores extraídas da logo oficial.

#### Modo Escuro (Padrão)

| Token | Valor Hex | Origem na Logo / Uso |
|---|---|---|
| `--bg-primary` | `#0A111E` | Fundo Midnight Navy |
| `--bg-surface` | `#111C2E` | Painéis e barras |
| `--bg-elevated` | `#18263E` | Cards e elementos |
| `--accent` | `#00B4D8` | Cyan da rede de IA (ações primárias) |
| `--brand-navy` | `#0B2545` | Navy do contorno da face |
| `--brand-cyan` | `#00C4CC` | Cyan brilhante dos pontos |
| `--success` | `#34D399` | Matches confirmados / Sucesso |
| `--warning` | `#FBBF24` | Revisão manual |
| `--error` | `#F87171` | Erros e rejeições |
| `--text-primary` | `#F0F6FC` | Texto principal |
| `--text-secondary` | `#94A3B8` | Texto secundário |
| `--border` | `#1E293B` | Bordas |

#### Modo Claro

| Token | Valor Hex | Uso |
|---|---|---|
| `--bg-primary` | `#F8FAFC` | Fundo Slate Claro |
| `--bg-surface` | `#FFFFFF` | Painéis e cards em branco puro |
| `--bg-elevated` | `#F1F5F9` | Elementos em destaque suave |
| `--accent` | `#0096C7` | Cyan Blue da marca |
| `--text-primary` | `#0B2545` | Texto principal em Navy escuro |
| `--text-secondary` | `#475569` | Texto secundário |
| `--border` | `#E2E8F0` | Bordas claras |

#### Modo Sistema

- Detecta automaticamente a preferência do sistema operacional (`prefers-color-scheme`) e alterna entre Escuro e Claro sem necessidade de reinicialização.


### Tipografia

| Uso | Fonte | Tamanho | Peso |
|---|---|---|---|
| Título da tela | Inter | 24px | 700 |
| Subtítulos | Inter | 16px | 600 |
| Corpo de texto | Inter | 14px | 400 |
| Labels | Inter | 12px | 500 |
| Score/badge | Inter Mono | 13px | 600 |

### Espaçamento (Grid de 4px)

| Token | Valor | Uso |
|---|---|---|
| `--space-xs` | 4px | Micro espaços |
| `--space-sm` | 8px | Espaços internos de componente |
| `--space-md` | 16px | Espaços entre componentes |
| `--space-lg` | 24px | Seções |
| `--space-xl` | 40px | Espaços maiores de layout |

### Bordas e Raios

| Elemento | Border Radius |
|---|---|
| Botões | 8px |
| Cards | 12px |
| Miniaturas | 8px |
| Modais | 16px |
| Badges/chips | 999px (pill) |

---

## 5. Estados dos Componentes

### Miniatura de Resultado

| Estado | Visual |
|---|---|
| Selecionada | Borda azul 2px, checkbox marcado |
| Desmarcada | Sem borda, checkbox vazio, opacidade 70% |
| Hover | Borda branca sutil, scale 1.02 |
| Em revisão manual | Borda amarela 2px |

### Botão de Ação Principal

| Estado | Visual |
|---|---|
| Normal | Background `--color-accent`, texto branco |
| Hover | Background `--color-accent-hover`, sombra sutil |
| Desabilitado | Opacidade 40%, cursor not-allowed |
| Carregando | Spinner + texto "Processando..." |

---

*Documento elaborado pelo agente `@UIUX` com base nos requisitos funcionais e no questionário de levantamento (25/07/2026).*
