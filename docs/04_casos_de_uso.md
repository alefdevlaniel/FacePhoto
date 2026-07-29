# 04 — Casos de Uso

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @Analista

---

## Atores do Sistema

| Ator | Descrição |
|---|---|
| **Usuário** | Pessoa que opera o aplicativo (técnico ou leigo) |
| **Sistema de Arquivos** | HD local, HD externo, pendrive ou pasta de rede |
| **Motor de IA** | Módulo interno de reconhecimento facial (sem interação humana) |
| **GPU/CPU** | Hardware de processamento detectado automaticamente |

---

## UC-001 — Busca Simples por Uma Pessoa

**Descrição:** Fluxo principal do sistema. O usuário encontra todas as fotos de uma pessoa em seu acervo.

**Ator principal:** Usuário

**Pré-condições:**
- Aplicativo instalado e aberto
- Usuário possui ao menos 1 foto de referência da pessoa buscada
- Pasta de origem existe e contém fotos

**Fluxo Principal:**

```
1. Usuário abre o aplicativo → Tela Inicial exibida
2. Usuário clica em "Nova Busca"
3. Usuário clica em "Adicionar Referência" ou arrasta foto de referência
   → Sistema exibe miniatura da foto adicionada
4. Usuário digita o nome da pessoa (ex: "Vó Maria")
5. Usuário clica em "Selecionar Pasta de Origem"
   → Seletor de diretório nativo do SO abre
   → Usuário seleciona pasta (ex: "HD Externo/Fotos Família")
6. Usuário clica em "Selecionar Pasta de Destino"
   → Usuário seleciona ou cria pasta de destino
7. Usuário clica em "Iniciar Análise"
8. Sistema executa Fase de Deduplicação
   → Sistema calcula hash perceptual de todas as fotos
   → Exibe: "847 fotos encontradas. 23 duplicatas detectadas e ignoradas."
9. Sistema executa Fase de Reconhecimento
   → Exibe barra de progresso em tempo real
   → "Analisando: 124 de 824 fotos | 15 encontradas até agora"
10. Processamento concluído
    → Sistema exibe Tela de Resultados
    → Grade com 38 fotos encontradas, ordenadas por score de confiança
11. Usuário revisa as fotos, desmarca 3 que não são da pessoa buscada
12. Usuário clica em "Copiar Selecionadas (35 fotos)"
13. Sistema copia as 35 fotos para a pasta de destino
14. Sistema exibe Relatório Final:
    → "35 fotos copiadas com sucesso | 3 desmarcadas | 3 em revisão manual"
15. Usuário clica em "Abrir Pasta de Destino"
    → Explorador de arquivos abre na pasta correta
```

**Fluxos Alternativos:**

| Situação | Comportamento |
|---|---|
| Foto de referência sem rosto detectável | Sistema avisa: "Não foi possível detectar um rosto nessa foto. Tente outra imagem." |
| Pasta de origem vazia ou sem fotos suportadas | Sistema avisa: "Nenhuma foto encontrada nessa pasta." |
| Pasta de destino = Pasta de origem | Sistema bloqueia e exibe mensagem de erro |
| Processamento cancelado pelo usuário | Resultados parciais são exibidos com aviso de cancelamento |

**Pós-condições:**
- Fotos selecionadas copiadas para pasta de destino
- Arquivos originais preservados na origem
- Sessão salva no histórico local

---

## UC-002 — Busca por Múltiplas Pessoas Simultaneamente

**Descrição:** O usuário busca por 2 ou mais pessoas na mesma sessão, otimizando o tempo de processamento.

**Ator principal:** Usuário

**Pré-condições:**
- Usuário possui fotos de referência para cada pessoa a buscar

**Fluxo Principal:**

```
1. Usuário inicia nova busca (igual ao UC-001, passos 1-2)
2. Usuário adiciona referência para Pessoa 1 ("Vó Maria") → miniatura exibida
3. Usuário clica em "+ Adicionar Outra Pessoa"
4. Usuário adiciona referência para Pessoa 2 ("Tio João") → miniatura exibida
5. Usuário seleciona pasta de origem e destino
6. Usuário ativa opção: "Criar subpastas por pessoa no destino" (opcional)
7. Usuário clica em "Iniciar Análise"
8. Sistema processa acervo uma única vez, comparando com ambas as referências
9. Tela de Resultados exibe abas separadas: "Vó Maria (38)" | "Tio João (22)" | "Ambos (5)"
10. Usuário revisa e copia separadamente para cada pessoa
    → Se subpastas ativadas: destino/Vó Maria/ e destino/Tio João/
```

**Critério importante:** O acervo é varrido **apenas uma vez**, mesmo para múltiplas pessoas, otimizando o tempo.

---

## UC-003 — Revisão Manual de Resultados Incertos

**Descrição:** O usuário revisa fotos que o sistema identificou com baixa confiança (score abaixo do threshold, mas acima de 35%).

**Ator principal:** Usuário

**Fluxo Principal:**

```
1. Após o processamento (UC-001), sistema identifica 12 fotos com confiança entre 35%-60%
2. Aba "Revisão Manual (12)" aparece na Tela de Resultados
3. Usuário clica na aba "Revisão Manual"
4. Sistema exibe grade com as 12 fotos incertas, cada uma com:
   → Score de confiança (ex: "47%")
   → Rosto detectado destacado com retângulo amarelo
   → Botões: [✓ Confirmar] e [✗ Rejeitar]
5. Usuário analisa cada foto:
   → Confirma 7 (a pessoa está realmente lá)
   → Rejeita 5 (falsos positivos — pessoas parecidas)
6. As 7 confirmadas são adicionadas automaticamente à seleção principal de cópia
```

---

## UC-004 — Detecção e Tratamento de Duplicatas

**Descrição:** O sistema detecta automaticamente fotos duplicadas no acervo antes do processamento.

**Ator principal:** Sistema (automático)

**Fluxo Principal:**

```
1. Usuário inicia análise (UC-001, passo 7)
2. Sistema inicia Fase de Deduplicação:
   → Percorre todas as fotos da pasta de origem
   → Calcula hash perceptual (pHash) de cada imagem
   → Compara hashes para identificar imagens visualmente idênticas ou muito similares
3. Sistema identifica grupos de duplicatas:
   → "foto_001.jpg" e "foto_001_copia.jpg" têm o mesmo hash
   → "IMG_3421.JPG" e "IMG_3421_edited.jpg" têm hash similar
4. Para cada grupo de duplicatas:
   → Sistema mantém apenas 1 arquivo para análise (o de maior resolução/tamanho)
   → Registra as demais como ignoradas no log
5. Tela de progresso exibe:
   → "1.200 fotos encontradas. 87 duplicatas detectadas e ignoradas. Analisando 1.113 fotos únicas."
```

**Resultado esperado:**
- Tempo de processamento reduzido
- Nenhuma foto duplicada copiada para a pasta de destino
- Arquivos originais (incluindo as duplicatas) preservados na origem

---

## UC-005 — Busca em HD Externo ou Dispositivo Removível

**Descrição:** O usuário seleciona como pasta de origem um HD externo, pendrive ou outro dispositivo removível.

**Ator principal:** Usuário

**Pré-condições:**
- Dispositivo externo está conectado e visível pelo sistema operacional

**Fluxo Principal:**

```
1. Usuário conecta HD externo ao computador
2. Usuário abre FacePhoto e inicia nova busca
3. Na seleção de pasta de origem, usuário navega até o dispositivo externo
   (ex: "D:\Fotos Família" no Windows, "/Volumes/HD_Externo/Fotos" no macOS)
4. Sistema valida se o dispositivo está acessível
5. Processamento ocorre normalmente (UC-001)
```

**Fluxo Alternativo:**

| Situação | Comportamento |
|---|---|
| Dispositivo desconectado durante processamento | Sistema pausa processamento, exibe alerta "Dispositivo desconectado". Oferece opção de aguardar reconexão ou cancelar com resultados parciais. |

---

## UC-006 — Visualização Ampliada de Foto com Rosto Destacado

**Descrição:** O usuário clica em uma foto na grade de resultados para visualizá-la em tamanho maior com o rosto da pessoa buscada destacado.

**Ator principal:** Usuário

**Fluxo Principal:**

```
1. Usuário está na Tela de Resultados com a grade de fotos
2. Usuário clica na miniatura de uma foto
3. Sistema abre visualizador com a foto em tamanho grande
4. Sistema desenha retângulo colorido ao redor do rosto detectado
   → Verde: alta confiança (acima do threshold)
   → Amarelo: confiança moderada (revisão manual)
5. Sistema exibe painel lateral com:
   → Nome do arquivo
   → Caminho completo
   → Score de confiança: "89%"
   → Data de criação da foto (EXIF)
   → Dimensões da imagem
6. Usuário pode navegar para próxima/anterior foto com teclas de seta
7. Usuário fecha o visualizador e retorna à grade
```

---

## UC-007 — Primeira Utilização (Onboarding)

**Descrição:** Usuário abre o aplicativo pela primeira vez e recebe orientação para completar a primeira busca.

**Ator principal:** Usuário

**Fluxo Principal:**

```
1. Usuário instala e abre FacePhoto pela primeira vez
2. Sistema detecta que não há histórico de uso
3. Sistema exibe tela de boas-vindas com breve explicação do produto
4. Sistema inicia tour guiado passo a passo:
   → Passo 1: "Adicione uma foto de referência da pessoa que deseja encontrar"
   → Passo 2: "Selecione a pasta onde suas fotos estão armazenadas"
   → Passo 3: "Escolha onde salvar as fotos encontradas"
   → Passo 4: "Clique em Iniciar Análise"
5. Usuário pode pular o tour a qualquer momento
6. Tour pode ser revisitado no menu Ajuda
```

---

## UC-008 — Exportar Relatório da Sessão

**Descrição:** Após uma sessão de busca, o usuário exporta um relatório com os resultados.

**Ator principal:** Usuário

**Pré-condições:**
- Sessão de busca concluída

**Fluxo Principal:**

```
1. Na tela de Relatório Final, usuário clica em "Exportar Relatório"
2. Sistema oferece opções de formato: PDF | HTML | CSV
3. Usuário seleciona formato e local de salvamento
4. Sistema gera o arquivo com:
   → Resumo da sessão
   → Lista de fotos encontradas com score e caminho
   → Miniaturas (somente para PDF/HTML)
5. Sistema abre o arquivo gerado automaticamente
```

> **Nota:** Este UC é classificado como **[DESEJÁVEL]** — pode ir para v1.1.

---

## Matriz de Rastreabilidade UC × RF

| Caso de Uso | Requisitos Funcionais Relacionados |
|---|---|
| UC-001 | RF-001, RF-003, RF-006, RF-007, RF-008, RF-010, RF-011, RF-012, RF-013, RF-014, RF-015, RF-016, RF-018, RF-019, RF-020 |
| UC-002 | RF-009, RF-016 |
| UC-003 | RF-008, RF-017 |
| UC-004 | RF-010 |
| UC-005 | RF-006 |
| UC-006 | RF-016 |
| UC-007 | RNF-008 |
| UC-008 | RF-020 |

---

*Documento elaborado pelo agente `@Analista` com base no questionário de levantamento de requisitos (25/07/2026).*
