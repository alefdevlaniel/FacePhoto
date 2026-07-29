# 02 — Requisitos Funcionais

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @Analista

---

## Convenções

| Símbolo | Significado |
|---|---|
| **[OBRIGATÓRIO]** | Deve estar presente na versão 1.0 |
| **[DESEJÁVEL]** | Importante, mas pode ir para v1.1 se necessário |
| **[FUTURO]** | Roadmap, não faz parte do escopo atual |

Formato de ID: `RF-NNN` (Requisito Funcional número NNN)

---

## Módulo 1 — Gerenciamento de Pessoas e Referências

### RF-001 · Cadastrar Pessoa [OBRIGATÓRIO]

O sistema deve permitir que o usuário cadastre uma pessoa pelo nome e associe a ela uma ou mais fotos de referência.

**Regras:**
- O nome é obrigatório e deve ter entre 2 e 100 caracteres
- Pelo menos 1 foto de referência é obrigatória para iniciar uma busca
- O sistema deve aceitar múltiplas fotos de referência da mesma pessoa (quanto mais, maior a precisão)
- Fotos de referência podem ser de qualquer tipo: frontal, perfil, grupo, ângulo variado, baixa qualidade

**Critérios de aceite:**
- [ ] Usuário consegue cadastrar pessoa fornecendo nome e 1+ fotos
- [ ] Sistema rejeita cadastro sem foto de referência com mensagem clara
- [ ] Pessoa cadastrada aparece na lista de perfis disponíveis para busca

---

### RF-002 · Adicionar Fotos de Referência via Arrastar e Soltar [OBRIGATÓRIO]

O sistema deve aceitar fotos de referência arrastadas diretamente para a área de upload da interface (drag and drop).

**Critérios de aceite:**
- [ ] Usuário pode arrastar 1 ou mais fotos para a área de referência
- [ ] Sistema exibe miniatura de cada foto adicionada
- [ ] Formatos inválidos são rejeitados com mensagem explicativa

---

### RF-003 · Adicionar Fotos de Referência via Seletor de Arquivos [OBRIGATÓRIO]

O sistema deve oferecer um botão para abrir o seletor de arquivos nativo do sistema operacional e selecionar as fotos de referência.

**Critérios de aceite:**
- [ ] Botão abre seletor de arquivo nativo
- [ ] Permite seleção múltipla de arquivos
- [ ] Fotos selecionadas aparecem como miniaturas na interface

---

### RF-004 · Remover Foto de Referência [OBRIGATÓRIO]

O usuário deve conseguir remover uma foto de referência já adicionada antes de iniciar a busca.

**Critérios de aceite:**
- [ ] Cada miniatura de referência possui botão de remoção
- [ ] Após remoção, a miniatura desaparece da listagem

---

### RF-005 · Listar Pessoas Cadastradas [DESEJÁVEL]

O sistema deve exibir uma lista de todas as pessoas já cadastradas com suas respectivas fotos de referência para reuso em buscas futuras.

**Critérios de aceite:**
- [ ] Lista exibe nome e miniatura da primeira foto de referência
- [ ] Usuário pode selecionar pessoa já cadastrada sem reimportar fotos

---

## Módulo 2 — Configuração da Busca

### RF-006 · Selecionar Pasta de Origem [OBRIGATÓRIO]

O sistema deve permitir que o usuário selecione a pasta (diretório) onde as fotos a serem analisadas estão armazenadas.

**Regras:**
- A pasta de origem pode ser local, em HD externo, pendrive ou pasta de rede
- O sistema deve percorrer **recursivamente todas as subpastas** da pasta selecionada
- A pasta de origem é obrigatória para iniciar uma busca

**Critérios de aceite:**
- [ ] Botão abre seletor de diretório nativo do SO
- [ ] Caminho selecionado é exibido na interface
- [ ] Sistema percorre subpastas automaticamente

---

### RF-007 · Selecionar Pasta de Destino [OBRIGATÓRIO]

O sistema deve permitir que o usuário selecione a pasta onde as fotos encontradas serão copiadas.

**Regras:**
- A pasta de destino não pode ser igual à pasta de origem
- Se a pasta de destino não existir, o sistema deve criá-la

**Critérios de aceite:**
- [ ] Botão abre seletor de diretório nativo do SO
- [ ] Sistema impede seleção de destino idêntico à origem com mensagem de erro
- [ ] Pasta de destino é criada automaticamente se não existir

---

### RF-008 · Ajustar Threshold de Confiança [OBRIGATÓRIO]

O sistema deve oferecer um controle (slider) para que o usuário ajuste o nível de confiança mínimo para considerar uma foto como resultado positivo.

**Regras:**
- Escala: 0% (muito permissivo) a 100% (muito restritivo)
- Valor padrão: 60% (equilíbrio entre recall e precisão)
- Resultados com score abaixo do threshold mínimo vão para "Revisão Manual"
- Resultados com score abaixo de 35% são descartados automaticamente

**Critérios de aceite:**
- [ ] Slider ajustável com valor percentual exibido
- [ ] Valor padrão de 60% ao abrir a tela
- [ ] Alteração do threshold afeta o comportamento da busca subsequente

---

### RF-009 · Configurar Busca por Múltiplas Pessoas [OBRIGATÓRIO]

O sistema deve permitir que o usuário selecione múltiplas pessoas para buscar simultaneamente na mesma sessão.

**Regras:**
- O usuário pode adicionar 1 ou mais pessoas à sessão de busca
- Os resultados de cada pessoa são exibidos separadamente
- A busca por múltiplas pessoas pode criar subpastas separadas por pessoa no destino (configurável)

**Critérios de aceite:**
- [ ] Interface permite adicionar múltiplas pessoas à mesma sessão
- [ ] Resultados são diferenciados por pessoa na tela de resultados

---

## Módulo 3 — Processamento

### RF-010 · Detectar Fotos Duplicadas Antes do Processamento [OBRIGATÓRIO]

Antes de iniciar o reconhecimento facial, o sistema deve identificar arquivos duplicados na pasta de origem e excluí-los da análise (processando apenas uma cópia de cada).

**Regras:**
- Duplicata é definida por **hash perceptual de imagem** (conteúdo visual equivalente), não apenas por nome de arquivo
- O sistema deve informar ao usuário quantas duplicatas foram encontradas e ignoradas
- Duplicatas identificadas **não são excluídas** da pasta de origem — apenas ignoradas no processamento

**Critérios de aceite:**
- [ ] Sistema calcula hash perceptual de todas as fotos antes do reconhecimento
- [ ] Fotos com hash idêntico ou muito similar têm apenas uma cópia analisada
- [ ] Tela de progresso exibe: "X duplicatas detectadas e ignoradas"
- [ ] Arquivos originais na pasta de origem permanecem intactos

---

### RF-011 · Detectar Rostos nas Fotos do Acervo [OBRIGATÓRIO]

O sistema deve identificar automaticamente todos os rostos presentes em cada foto do acervo.

**Regras:**
- Fotos sem nenhum rosto detectado são descartadas silenciosamente do processo de comparação
- O sistema deve processar fotos com múltiplos rostos (grupos)
- Rostos muito pequenos (menor que 20x20 pixels) podem ser ignorados

**Critérios de aceite:**
- [ ] Sistema processa fotos com 1 ou múltiplos rostos
- [ ] Fotos sem rosto são descartadas sem erro

---

### RF-012 · Comparar Rostos com as Referências [OBRIGATÓRIO]

O sistema deve comparar cada rosto detectado nas fotos do acervo com os embeddings (vetores de características faciais) das pessoas de referência cadastradas.

**Regras:**
- A comparação é feita usando similaridade de cosseno ou distância euclidiana entre embeddings
- Uma foto é considerada "encontrada" quando pelo menos um rosto na foto tem similaridade acima do threshold configurado
- Fotos em grupo (com outras pessoas além da buscada) devem ser **incluídas** nos resultados

**Critérios de aceite:**
- [ ] Fotos contendo a pessoa buscada entre outras aparecem nos resultados
- [ ] Score de confiança (0 a 100%) é calculado e exibido para cada resultado
- [ ] Busca é executada para todas as pessoas selecionadas na sessão

---

### RF-013 · Detectar e Utilizar GPU Automaticamente [OBRIGATÓRIO]

O sistema deve detectar automaticamente se uma GPU compatível está disponível e usá-la para acelerar o processamento. Se não houver GPU, deve usar a CPU como fallback.

**Regras:**
- Compatibilidade: NVIDIA CUDA, AMD ROCm (quando disponível), Apple Metal (macOS)
- O usuário deve ser informado sobre qual dispositivo está sendo usado
- Não deve ser necessária nenhuma configuração manual para isso funcionar

**Critérios de aceite:**
- [ ] Sistema detecta GPU automaticamente ao iniciar
- [ ] Tela de status indica "Processando com GPU: [nome]" ou "Processando com CPU"
- [ ] Processamento funciona corretamente mesmo sem GPU

---

### RF-014 · Exibir Progresso em Tempo Real [OBRIGATÓRIO]

Durante o processamento, o sistema deve exibir o progresso atual de forma contínua e atualizada.

**Regras:**
- Informações exibidas: total de fotos, fotos processadas, fotos encontradas, duplicatas ignoradas, tempo decorrido, tempo estimado restante

**Critérios de aceite:**
- [ ] Barra de progresso percentual visível
- [ ] Contador "X de Y fotos analisadas" atualizado em tempo real
- [ ] Nome ou miniatura da foto sendo processada no momento
- [ ] Tempo decorrido e estimativa de conclusão exibidos
- [ ] Botão de cancelamento disponível durante o processamento

---

### RF-015 · Suportar Múltiplos Formatos de Imagem [OBRIGATÓRIO]

O sistema deve processar fotos nos seguintes formatos:

| Formato | Extensões |
|---|---|
| JPEG | `.jpg`, `.jpeg` |
| PNG | `.png` |
| WebP | `.webp` |
| HEIC/HEIF | `.heic`, `.heif` |
| BMP | `.bmp` |
| TIFF | `.tif`, `.tiff` |
| RAW (câmera) | `.cr2`, `.cr3`, `.nef`, `.arw`, `.orf`, `.rw2`, `.dng` |

**Critérios de aceite:**
- [ ] Todos os formatos listados são lidos sem erro
- [ ] Formatos não suportados são ignorados com log de aviso (sem interromper o processo)

---

## Módulo 4 — Resultados e Revisão

### RF-016 · Exibir Resultados em Grade Visual [OBRIGATÓRIO]

Após o processamento, o sistema deve exibir as fotos encontradas em uma grade visual (galeria) para revisão do usuário.

**Regras:**
- Cada foto exibe: miniatura, nome do arquivo, caminho relativo, score de confiança, pessoa encontrada
- Fotos devem ser ordenadas por score de confiança (maior para menor)
- O usuário pode clicar na miniatura para ver a foto em tamanho maior

**Critérios de aceite:**
- [ ] Grade com miniaturas é exibida após o processamento
- [ ] Score de confiança visível em cada miniatura (ex: "87%")
- [ ] Clique na miniatura abre visualização ampliada
- [ ] Foto ampliada exibe o rosto identificado destacado com um retângulo

---

### RF-017 · Exibir Aba de Revisão Manual [OBRIGATÓRIO]

Fotos com score de confiança abaixo do threshold configurado, mas acima de 35%, devem ser listadas em uma aba separada chamada "Revisão Manual".

**Critérios de aceite:**
- [ ] Aba "Revisão Manual" aparece na tela de resultados quando há itens incertos
- [ ] Usuário pode aceitar ou rejeitar cada item da revisão manualmente
- [ ] Itens aceitos passam para a seleção principal de cópia

---

### RF-018 · Selecionar Fotos para Copiar [OBRIGATÓRIO]

O usuário deve poder selecionar quais fotos serão copiadas para a pasta de destino antes de executar a cópia.

**Regras:**
- Por padrão, todos os resultados confirmados são pré-selecionados
- O usuário pode desmarcar individualmente fotos indesejadas
- Deve haver opções de "Selecionar Tudo" e "Desmarcar Tudo"

**Critérios de aceite:**
- [ ] Checkboxes individuais em cada miniatura de resultado
- [ ] Botões "Selecionar Tudo" e "Desmarcar Tudo" funcionais
- [ ] Contador de "X fotos selecionadas" atualizado dinamicamente
- [ ] Botão "Copiar Selecionadas" só fica ativo quando há ao menos 1 selecionada

---

### RF-019 · Copiar Fotos para Pasta de Destino [OBRIGATÓRIO]

O sistema deve copiar as fotos selecionadas para a pasta de destino definida na configuração, preservando os arquivos originais.

**Regras:**
- Operação é sempre **cópia** — o arquivo original nunca é removido ou modificado
- Se já existir um arquivo com o mesmo nome na pasta de destino, o sistema deve renomear o novo arquivo com sufixo numérico (ex: `foto.jpg` → `foto_2.jpg`)
- Os metadados originais (EXIF: data, GPS, câmera) devem ser preservados no arquivo copiado

**Critérios de aceite:**
- [ ] Arquivos originais permanecem intactos na origem
- [ ] Cópia preserva metadados EXIF completos
- [ ] Conflito de nome é resolvido automaticamente com sufixo
- [ ] Progresso da cópia é exibido (X de Y copiadas)

---

### RF-020 · Exibir Relatório Final [OBRIGATÓRIO]

Após a cópia, o sistema deve exibir um resumo da sessão de busca.

**Informações do relatório:**
- Total de fotos analisadas
- Total de duplicatas ignoradas
- Total de resultados encontrados (por pessoa)
- Total de fotos copiadas
- Tempo total de processamento
- Pasta de destino utilizada

**Critérios de aceite:**
- [ ] Relatório exibido automaticamente após conclusão da cópia
- [ ] Botão "Abrir Pasta de Destino" abre o explorador de arquivos na pasta correta
- [ ] Botão "Nova Busca" retorna para a tela inicial

---

## Módulo 5 — Funcionalidades de Suporte

### RF-021 · Cancelar Processamento em Andamento [OBRIGATÓRIO]

O usuário deve conseguir cancelar o processamento a qualquer momento.

**Regras:**
- Ao cancelar, o processamento para imediatamente
- Resultados já encontrados até o momento do cancelamento são preservados e exibidos
- Arquivos já copiados permanecem na pasta de destino

**Critérios de aceite:**
- [ ] Botão "Cancelar" visível durante o processamento
- [ ] Clique no botão interrompe o processamento em no máximo 3 segundos
- [ ] Resultados parciais são exibidos com aviso de cancelamento

---

### RF-022 · Pausar e Retomar Processamento [OBRIGATÓRIO]

O usuário deve conseguir pausar o processamento em andamento e retomá-lo quando quiser, sem perder o progresso já realizado.

**Regras:**
- Ao pausar, o processamento é suspenso após concluir a foto atual (não no meio de uma análise)
- O estado do processamento é preservado: fotos já analisadas, resultados parciais e posição no acervo
- O usuário pode retomar a qualquer momento a partir do ponto onde parou
- Se o aplicativo for fechado enquanto pausado, o estado deve ser salvo e a retomada deve ser oferecida na próxima abertura
- Pausar é diferente de cancelar: ao retomar, o processamento continua; ao cancelar, ele é encerrado definitivamente

**Critérios de aceite:**
- [ ] Botão "Pausar" visível e ativo durante o processamento
- [ ] Ao clicar em "Pausar", o processamento suspende após a foto em andamento (máximo 5 segundos)
- [ ] Botão muda para "Retomar" quando pausado
- [ ] Ao clicar em "Retomar", o processamento continua a partir da última foto processada
- [ ] Resultados parciais permanecem visíveis enquanto pausado
- [ ] Estado de pausa é persistido: ao fechar e reabrir o app, sistema oferece opção de continuar a sessão interrompida

---

### RF-023 · Funcionamento Completamente Offline [OBRIGATÓRIO]

O sistema deve funcionar sem qualquer conexão com a internet. Nenhuma imagem, embedding ou dado pessoal deve ser enviado para servidores externos.

**Critérios de aceite:**
- [ ] Aplicativo funciona sem conexão de rede
- [ ] Nenhuma chamada de rede é feita durante o processamento de imagens
- [ ] Modelos de IA são empacotados localmente com o instalador

---

### RF-024 · Histórico de Sessões [DESEJÁVEL]

O sistema deve manter um histórico das últimas sessões de busca realizadas.

**Critérios de aceite:**
- [ ] Tela de histórico lista sessões com data, pessoa buscada, total encontrado
- [ ] Usuário pode re-abrir resultados de uma sessão anterior

---

### RF-025 · Cache de Embeddings [DESEJÁVEL]

O sistema deve armazenar localmente os embeddings calculados para o acervo de fotos já processado, evitando recalcular em buscas futuras.

**Critérios de aceite:**
- [ ] Em segunda busca na mesma pasta, embeddings são reutilizados
- [ ] Cache é invalidado automaticamente quando o arquivo original é modificado

---

*Documento elaborado pelo agente `@Analista` com base no questionário de levantamento de requisitos (25/07/2026).*
