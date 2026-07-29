# 01 — Visão do Produto

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @PO

---

## 1. Identificação do Produto

| Campo | Valor |
|---|---|
| **Nome do Produto** | FacePhoto |
| **Tagline** | *Encontre qualquer pessoa em suas fotos, de forma simples e privada.* |
| **Categoria** | Software desktop de organização e reconhecimento facial de fotos |
| **Plataformas** | Windows, macOS, Linux |
| **Modelo de distribuição** | Aplicativo desktop instalável (instalador por plataforma) |
| **Licença inicial** | Uso pessoal; futuramente modelo comercial/licença paga |

---

## 2. Problema que o Produto Resolve

Acervos de fotos digitais crescem por décadas. Uma família comum acumula milhares de fotos espalhadas em HDs externos, pastas locais e dispositivos variados. Encontrar **todas as fotos em que uma pessoa específica aparece** dentro desse volume é uma tarefa manual, demorada e frustrante.

### Dor Principal

> *"Quero encontrar todas as fotos onde minha sogra aparece, espalhadas no meu HD externo, para reunir em uma pasta e mostrar ao meu filho pequeno conhecer a avó."*

Esse cenário se repete em diversas situações:
- Reunir fotos de um familiar falecido para homenagem
- Organizar registros de uma criança ao longo dos anos
- Separar fotos de um convidado específico em evento
- Fotógrafo profissional entregando fotos de um cliente

### Problema Técnico Atual

As soluções existentes no mercado ou:
1. **Requerem envio de fotos para a nuvem** (privacidade comprometida)
2. **São ferramentas para desenvolvedores** (linha de comando, sem interface)
3. **Não lidam com grandes volumes** de forma eficiente
4. **Não permitem revisão antes de agir** (copiam ou movem automaticamente)

O FacePhoto resolve tudo isso com uma interface acessível, processamento local e fluxo de revisão antes de qualquer ação.

---

## 3. Público-Alvo

### 3.1 Usuário Primário (Lançamento)

| Característica | Descrição |
|---|---|
| **Perfil** | Pessoa física com acervo de fotos pessoais ou familiares |
| **Conhecimento técnico** | Baixo a médio — não precisa saber programar |
| **Motivação** | Encontrar fotos de pessoas específicas para memória afetiva |
| **Dispositivos** | Computador pessoal com Windows ou macOS |
| **Acervo típico** | 500 a 10.000 fotos em HD externo ou pasta local |

### 3.2 Usuário Secundário (Expansão Comercial)

| Perfil | Caso de Uso |
|---|---|
| **Fotógrafo profissional** | Separar fotos de cada cliente após evento (casamento, festa, formatura) |
| **Pequenas empresas** | Identificar colaboradores específicos em registros fotográficos internos |
| **Jornalistas / pesquisadores** | Localizar pessoa em acervo de imagens históricas ou de pesquisa |

---

## 4. Proposta de Valor

```
┌─────────────────────────────────────────────────────────────────────┐
│  FacePhoto entrega:                                                 │
│                                                                     │
│  ✓ Encontrar qualquer pessoa em milhares de fotos em minutos       │
│  ✓ 100% local — nenhuma foto sai do seu computador                 │
│  ✓ Interface simples, sem necessidade de conhecimento técnico       │
│  ✓ Revisão visual antes de copiar — você decide o que guardar      │
│  ✓ Funciona com qualquer formato de imagem                         │
│  ✓ Usa automaticamente a GPU ou CPU disponível                     │
│  ✓ Multiplataforma: Windows, macOS e Linux                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Diferencial Competitivo

| Característica | FacePhoto | Google Fotos | Soluções CLI | Apps genéricos |
|---|:---:|:---:|:---:|:---:|
| 100% offline e privado | ✅ | ❌ | ✅ | ❌ |
| Interface gráfica amigável | ✅ | ✅ | ❌ | ✅ |
| Revisão antes de copiar | ✅ | ❌ | ❌ | ❌ |
| Múltiplos formatos (incl. RAW, HEIC) | ✅ | ⚠️ | ⚠️ | ⚠️ |
| Detecção de duplicatas | ✅ | ❌ | ❌ | ❌ |
| Multiplataforma sem nuvem | ✅ | ❌ | ✅ | ❌ |
| Auto-detect GPU/CPU | ✅ | N/A | ⚠️ | ❌ |

---

## 6. Premissas e Restrições

### Premissas

- O usuário possui as fotos armazenadas localmente ou em mídia externa
- O usuário fornece pelo menos 1 foto de referência da pessoa a ser buscada
- O computador possui recursos mínimos para processamento de IA local
- O produto não é responsável pela precisão em casos extremos (rostos muito cobertos, imagens de resolução inferior a 50x50 pixels)

### Restrições

- **Sem processamento de vídeo** na versão 1.0 (roadmap futuro)
- **Sem integração com nuvem** na versão 1.0 (roadmap futuro)
- **Sem interface mobile** na versão 1.0 (roadmap futuro)
- O produto **não deve ser usado** para reconhecimento facial sem consentimento das pessoas fotografadas em contextos que violem legislação de privacidade (LGPD, GDPR)

---

## 7. Roadmap de Versões

### v1.0 — MVP (Produto Mínimo Viável)

**Foco:** Fluxo principal funcionando com qualidade

- Busca por 1 ou mais pessoas simultaneamente
- Suporte a todos os formatos de imagem relevantes
- Interface desktop moderna e intuitiva
- Detecção de duplicatas
- Revisão visual dos resultados
- Cópia para pasta de destino com preservação de metadados
- Processamento offline com auto-detect de GPU/CPU
- Multiplataforma (Windows, macOS, Linux)

### v1.1 — Histórico e Banco de Rostos

- Banco local de pessoas cadastradas
- Histórico de sessões de busca
- Reuso de embeddings calculados (cache)

### v1.2 — Relatórios e Exportação

- Relatório HTML/PDF com fotos encontradas
- Exportação de lista de resultados para Excel/CSV
- Estatísticas de busca

### v2.0 — Expansão de Mídia

- Processamento de vídeo (extrair frames e identificar pessoa)
- Integração opcional com Google Fotos (importar para análise local)
- Agendamento automático de buscas

### v3.0 — Plataforma

- Interface mobile (tablet) para revisão de resultados
- Versão cloud-optional para equipes (fotógrafos profissionais)

---

## 8. Critérios de Sucesso do Produto

| Critério | Meta para v1.0 |
|---|---|
| Taxa de detecção (recall) | ≥ 85% em fotos de boa qualidade |
| Taxa de falsos positivos | ≤ 5% com threshold padrão |
| Tempo de processamento | ≤ 3 segundos por foto (com GPU) |
| Usabilidade | Usuário leigo conclui primeira busca sem ajuda externa |
| Estabilidade | Zero crashes em acervos de até 5.000 fotos |

---

*Documento elaborado pelo agente `@PO` com base no questionário de levantamento de requisitos (25/07/2026).*
