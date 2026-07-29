# 09 — Plano de Testes

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @QA

---

## 1. Objetivos e Estratégia

O plano de testes do FacePhoto tem como objetivo garantir que:

1. O **motor de reconhecimento facial** funciona corretamente em diferentes condições de imagem
2. A **lógica de negócio** (deduplicação, ranqueamento, cópia) é robusta e livre de regressões
3. A **API** expõe os endpoints corretamente e lida com erros de forma segura
4. A **interface** oferece experiência consistente e sem erros de interação
5. O **sistema completo** funciona corretamente nas três plataformas suportadas

### Pirâmide de Testes

```
          /─────────────────\
         /   E2E / Manual    \    ← Menos testes, maior custo
        /─────────────────────\
       /   Integração (API)    \
      /─────────────────────────\
     /     Unitários (Core)      \  ← Mais testes, menor custo
    /─────────────────────────────\
```

| Nível | Cobertura alvo | Ferramentas |
|---|---|---|
| Unitários | ≥ 80% do Core Engine | pytest + pytest-mock |
| Integração | Endpoints críticos | pytest + httpx |
| E2E / Manual | Fluxos principais | Execução manual por plataforma |

---

## 2. Testes Unitários — Core Engine

### 2.1 Módulo: FileScanner

**Arquivo:** `tests/unit/test_file_scanner.py`

| ID | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| UT-001 | Pasta com fotos válidas | Pasta com JPG, PNG, WebP | Lista com todos os arquivos suportados |
| UT-002 | Pasta com subpastas | Pasta raiz com 3 subpastas | Arquivos de todas as subpastas (recursivo) |
| UT-003 | Pasta com arquivos mistos | Fotos + .txt + .pdf + .mp4 | Apenas arquivos de imagem suportados |
| UT-004 | Pasta vazia | Pasta sem arquivos | Lista vazia sem erro |
| UT-005 | Pasta inexistente | Caminho inválido | `FileNotFoundError` com mensagem descritiva |
| UT-006 | Arquivo RAW | Pasta com .cr2, .nef, .arw | Arquivos RAW incluídos na lista |
| UT-007 | Arquivo HEIC | Pasta com .heic | Arquivo HEIC incluído na lista |
| UT-008 | Arquivo sem permissão de leitura | Arquivo com permissão negada | Ignorado com log de aviso; restante processado |

---

### 2.2 Módulo: DuplicateDetector

**Arquivo:** `tests/unit/test_duplicate_detector.py`

| ID | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| UT-009 | Sem duplicatas | 10 fotos únicas | Lista retorna as 10 fotos |
| UT-010 | Duplicata exata | foto.jpg + copia_foto.jpg (mesmo conteúdo) | Apenas 1 das 2 retornada |
| UT-011 | Mesma foto, JPEG diferente | foto.jpg + foto_comprimida.jpg | Detectado como duplicata (pHash similar) |
| UT-012 | Foto redimensionada | foto.jpg + foto_thumb.jpg (menor) | Detectado como duplicata |
| UT-013 | Fotos parecidas mas diferentes | Foto A e Foto B (pessoas diferentes) | Ambas mantidas (não são duplicatas) |
| UT-014 | Grupo de 3 duplicatas | foto1.jpg = foto2.jpg = foto3.jpg | Apenas 1 retornada (maior resolução) |
| UT-015 | Arquivo corrompido no acervo | Arquivo com bytes inválidos | Ignorado com log; restante processado |

---

### 2.3 Módulo: FaceRecognitionEngine

**Arquivo:** `tests/unit/test_face_engine.py`

| ID | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| UT-016 | Foto frontal nítida, 1 rosto | Selfie clara | 1 rosto detectado, embedding extraído |
| UT-017 | Foto em grupo, 4 rostos | Foto de família | 4 rostos detectados, 4 embeddings |
| UT-018 | Foto sem rosto | Paisagem | Lista vazia de rostos (sem erro) |
| UT-019 | Foto muito pequena (< 50px) | Thumbnail minúsculo | Lista vazia ou rosto ignorado |
| UT-020 | Comparação: mesma pessoa | Ref A vs Foto A (mesma pessoa) | Score ≥ 0.75 |
| UT-021 | Comparação: pessoas diferentes | Ref A vs Foto B (pessoa diferente) | Score ≤ 0.35 |
| UT-022 | Foto de perfil (90°) | Rosto completamente de lado | Detectado ou marcado como "baixa confiança" |
| UT-023 | Foto com máscara | Rosto coberto por máscara | Detectado com score reduzido ou não detectado |
| UT-024 | Foto muito escura | Foto noturna, pouca luz | Score reduzido ou vai para revisão manual |
| UT-025 | Foto antiga/digitalizada | Scan de foto dos anos 80 | Processado sem erro; score pode ser baixo |
| UT-026 | Foto com múltiplas pessoas, 1 é a buscada | Grupo, 1 match | Score alto para rosto correto, baixo para demais |

---

### 2.4 Módulo: ResultRanker

**Arquivo:** `tests/unit/test_result_ranker.py`

| ID | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| UT-027 | Score alto | score=0.92, threshold=0.60 | Status: "confirmado" |
| UT-028 | Score no threshold | score=0.60, threshold=0.60 | Status: "confirmado" |
| UT-029 | Score abaixo do threshold | score=0.55, threshold=0.60 | Status: "revisao_manual" |
| UT-030 | Score muito baixo | score=0.30, threshold=0.60 | Status: "descartado" |
| UT-031 | Ordenação | Lista desordenada de resultados | Retorna ordenado por score DESC |
| UT-032 | Threshold personalizado (0.80) | score=0.75, threshold=0.80 | Status: "revisao_manual" |
| UT-033 | Lista vazia | Nenhum resultado | Lista vazia sem erro |

---

### 2.5 Módulo: FileCopyManager

**Arquivo:** `tests/unit/test_file_copy_manager.py`

| ID | Cenário | Entrada | Resultado Esperado |
|---|---|---|---|
| UT-034 | Cópia simples | 1 arquivo, destino vazio | Arquivo copiado, original preservado |
| UT-035 | Conflito de nome | foto.jpg já existe no destino | Copia como foto_2.jpg |
| UT-036 | Metadados EXIF preservados | Foto com EXIF (data, GPS, câmera) | EXIF mantido no arquivo copiado |
| UT-037 | Pasta de destino inexistente | Destino ainda não existe | Pasta criada automaticamente |
| UT-038 | Sem permissão de escrita | Destino protegido | Erro reportado; restante continua |
| UT-039 | Cópia de múltiplos arquivos | 50 arquivos | Todos copiados corretamente |
| UT-040 | Cópia de RAW (cr2, nef) | Arquivo .cr2 | Arquivo copiado sem conversão |

---

### 2.6 Módulo: HardwareDetector

**Arquivo:** `tests/unit/test_hardware_detector.py`

| ID | Cenário | Resultado Esperado |
|---|---|---|
| UT-041 | GPU NVIDIA disponível | Retorna "cuda" |
| UT-042 | Apple Silicon (MPS) | Retorna "mps" |
| UT-043 | Sem GPU dedicada | Retorna "cpu" |
| UT-044 | Ambiente mockado sem GPU | Retorna "cpu" sem erro |

---

## 3. Testes de Integração — API (FastAPI)

**Arquivo:** `tests/integration/test_api.py`

| ID | Endpoint | Cenário | Resultado Esperado |
|---|---|---|---|
| IT-001 | `POST /api/pessoas` | Cadastrar pessoa válida | Status 201, pessoa criada com ID |
| IT-002 | `POST /api/pessoas` | Nome vazio | Status 422, mensagem de validação |
| IT-003 | `POST /api/pessoas` | Sem foto de referência | Status 422 |
| IT-004 | `GET /api/pessoas` | Listar pessoas | Status 200, lista de pessoas |
| IT-005 | `POST /api/sessoes` | Iniciar sessão válida | Status 201, sessão em andamento |
| IT-006 | `POST /api/sessoes` | Pasta de origem = destino | Status 400, mensagem de erro |
| IT-007 | `POST /api/sessoes` | Pasta de origem inexistente | Status 400 |
| IT-008 | `GET /api/sessoes/{id}/progresso` | Sessão em andamento | Stream SSE com eventos de progresso |
| IT-009 | `GET /api/sessoes/{id}/resultados` | Sessão concluída | Status 200, lista de resultados |
| IT-010 | `POST /api/sessoes/{id}/copiar` | Copiar seleção válida | Status 200, relatório de cópia |
| IT-011 | `GET /api/sessoes` | Listar histórico | Status 200, lista de sessões |

---

## 4. Testes de Cenários de Borda

Cenários críticos que devem ser testados manualmente ou via automação de ponta-a-ponta:

| ID | Cenário | Procedimento | Resultado Esperado |
|---|---|---|---|
| CE-001 | Acervo com 5.000 fotos | Executar busca completa | Completa sem crash; RAM estável |
| CE-002 | HD externo desconectado durante busca | Iniciar busca, desconectar HD | Pausa com mensagem; resultados parciais preservados |
| CE-003 | Fechar app durante processamento | Clicar X durante análise | App fecha; na reabertura, resultados parciais disponíveis |
| CE-004 | Foto de referência com múltiplos rostos | Referência com 3 pessoas | Aviso ao usuário: "Múltiplos rostos detectados na referência" |
| CE-005 | Acervo com 0 fotos suportadas | Pasta só com .txt e .pdf | Mensagem clara: "Nenhuma foto encontrada nessa pasta" |
| CE-006 | Foto duplicada: mesma foto em 2 formatos | foto.jpg e foto.png (mesmo conteúdo) | Apenas uma analisada |
| CE-007 | Busca por 3 pessoas simultâneas | 3 referências adicionadas | Acervo varrido 1x; resultados separados por pessoa |
| CE-008 | Pasta de destino sem espaço em disco | Disco cheio | Erro claro sobre espaço insuficiente |

---

## 5. Testes de Performance

| ID | Cenário | Métrica | Meta |
|---|---|---|---|
| PF-001 | 100 fotos com GPU NVIDIA | Tempo total | ≤ 5 minutos |
| PF-002 | 100 fotos sem GPU (CPU) | Tempo total | ≤ 17 minutos |
| PF-003 | 1.000 fotos com GPU | Tempo total | ≤ 50 minutos |
| PF-004 | Fase de deduplicação — 1.000 fotos | Tempo da fase | ≤ 2 minutos |
| PF-005 | Uso de RAM em 5.000 fotos | Memória máxima | ≤ 4 GB |
| PF-006 | UI responsiva durante processamento | Tempo de resposta ao "Cancelar" | ≤ 500ms |

---

## 6. Testes de Plataforma

Cada versão deve ser testada manualmente nos três SOs suportados:

| Checklist | Windows 10 | Windows 11 | macOS 12 | macOS 14 | Ubuntu 22.04 |
|---|:---:|:---:|:---:|:---:|:---:|
| Instalação limpa | ☐ | ☐ | ☐ | ☐ | ☐ |
| Abertura do app | ☐ | ☐ | ☐ | ☐ | ☐ |
| Seletor de pasta funciona | ☐ | ☐ | ☐ | ☐ | ☐ |
| Drag & drop de foto | ☐ | ☐ | ☐ | ☐ | ☐ |
| Processamento completo | ☐ | ☐ | ☐ | ☐ | ☐ |
| Cópia com metadados | ☐ | ☐ | ☐ | ☐ | ☐ |
| Abrir pasta no explorador | ☐ | ☐ | ☐ | ☐ | ☐ |
| HD externo reconhecido | ☐ | ☐ | ☐ | ☐ | ☐ |

---

## 7. Testes de Precisão do Motor de Reconhecimento

Para validar a qualidade do reconhecimento facial, será criado um **dataset de teste padronizado**:

```
tests/fixtures/
├── referencias/
│   └── pessoa_a/
│       ├── frontal_nitido.jpg
│       ├── perfil_45graus.jpg
│       └── foto_grupo.jpg
├── acervo_teste/
│   ├── true_positives/       # Fotos com pessoa_a (deve encontrar)
│   │   ├── frontal.jpg
│   │   ├── grupo_com_pessoa.jpg
│   │   ├── foto_antiga.jpg
│   │   └── baixa_qualidade.jpg
│   ├── true_negatives/       # Fotos sem pessoa_a (não deve encontrar)
│   │   ├── outra_pessoa.jpg
│   │   └── pessoa_parecida.jpg
│   └── edge_cases/           # Casos difíceis
│       ├── mascara.jpg
│       ├── muito_escuro.jpg
│       └── rosto_minusculo.jpg
```

**Métricas alvo com threshold padrão (60%):**

| Métrica | Fórmula | Meta v1.0 |
|---|---|---|
| **Recall (Sensibilidade)** | TP / (TP + FN) | ≥ 85% |
| **Precisão** | TP / (TP + FP) | ≥ 90% |
| **F1-Score** | 2 × (P × R) / (P + R) | ≥ 87% |

---

## 8. Fluxo de Execução dos Testes

```bash
# 1. Testes unitários com cobertura
pytest tests/unit/ -v --cov=src/backend/core --cov-report=html

# 2. Testes de integração (requer backend rodando)
pytest tests/integration/ -v

# 3. Verificar cobertura mínima (falha se < 80%)
pytest tests/unit/ --cov=src/backend/core --cov-fail-under=80

# 4. Linting e tipagem
ruff check src/
mypy src/backend/

# 5. Teste de precisão do motor
pytest tests/precision/ -v --tb=short
```

---

## 9. Critérios de Aceite para Release

Uma versão só pode ser liberada quando:

- [ ] Todos os testes unitários passam (0 falhas)
- [ ] Todos os testes de integração passam (0 falhas)
- [ ] Cobertura de código ≥ 80% nos módulos core
- [ ] Recall ≥ 85% e Precisão ≥ 90% no dataset de precisão
- [ ] Nenhum crash durante teste de 5.000 fotos
- [ ] Checklist de plataforma completo para Windows, macOS e Linux
- [ ] Zero vazamento de dados de rede (verificado com Wireshark)
- [ ] Linting sem erros (`ruff`, `mypy`, `eslint`)

---

*Documento elaborado pelo agente `@QA` com base nos requisitos funcionais e não funcionais do projeto (25/07/2026).*
