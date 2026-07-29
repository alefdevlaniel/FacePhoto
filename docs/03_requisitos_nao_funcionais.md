# 03 — Requisitos Não Funcionais

**Projeto:** FacePhoto
**Versão:** 1.0
**Data:** 25/07/2026
**Responsável:** @Analista + @Arquiteto

---

## Convenções

Formato de ID: `RNF-NNN` (Requisito Não Funcional número NNN)

Cada requisito tem:
- **Categoria:** Área de qualidade do software
- **Prioridade:** Alta / Média / Baixa
- **Verificabilidade:** Como será verificado

---

## Categoria 1 — Desempenho

### RNF-001 · Tempo de Processamento por Foto

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | O sistema deve processar cada foto dentro de limites aceitáveis de tempo |
| **Meta com GPU** | ≤ 3 segundos por foto (detecção + comparação) |
| **Meta sem GPU (CPU)** | ≤ 10 segundos por foto |
| **Verificação** | Benchmark automatizado com amostra de 100 fotos padronizadas |

---

### RNF-002 · Escalabilidade de Volume

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | O sistema deve processar acervos de até **30.000 fotos** sem degradação crítica de desempenho, travamento ou estouro de memória |
| **Meta de estabilidade** | Processamento contínuo sem crash do início ao fim; uso de memória RAM estável durante toda a execução (sem vazamento) |
| **Meta de RAM** | Pico de uso de RAM ≤ 6 GB independente do volume do acervo |
| **Verificação** | Teste de stress com acervos de 5.000, 10.000 e 30.000 fotos monitorando CPU, RAM, tempo total e taxa de erros |

**Estratégias técnicas obrigatórias para suportar 30.000 fotos:**

- **Processamento em lotes (batching):** as fotos devem ser lidas e processadas em grupos (ex: 50 por vez), nunca carregando o acervo inteiro na memória RAM simultaneamente
- **Streaming de arquivos:** o scanner de arquivos deve usar um gerador (lazy evaluation) que lê os caminhos sob demanda, sem construir uma lista completa em memória
- **Cache de embeddings em disco:** embeddings já calculados em sessões anteriores devem ser recuperados do banco SQLite, evitando reprocessamento e reduzindo carga de memória
- **Liberação explícita de memória:** após processar cada lote, objetos de imagem e arrays numpy devem ser explicitamente liberados (`del` + `gc.collect()` quando necessário)
- **Processamento assíncrono com fila:** utilizar uma fila de trabalho (queue) entre o leitor de arquivos e o motor de IA, mantendo o pipeline sempre ocupado sem acumular dados


---

### RNF-003 · Responsividade da Interface Durante Processamento

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | A interface do usuário deve permanecer responsiva durante o processamento (o aplicativo não deve "congelar") |
| **Meta** | Processamento deve ocorrer em thread/processo separado da UI; botão de cancelar sempre responde em ≤ 500ms |
| **Verificação** | Teste manual: clicar "cancelar" durante processamento de 1.000 fotos |

---

### RNF-004 · Detecção de Duplicatas

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Descrição** | A fase de deduplicação (hashing perceptual) deve ser executada em tempo aceitável |
| **Meta** | ≤ 100ms por foto para cálculo de hash perceptual |
| **Verificação** | Benchmark com 1.000 fotos medindo tempo da fase de deduplicação |

---

## Categoria 2 — Privacidade e Segurança

### RNF-005 · Processamento 100% Local

| Campo | Valor |
|---|---|
| **Prioridade** | Alta (crítico) |
| **Descrição** | Nenhuma imagem, embedding vetorial, metadado ou dado pessoal pode ser transmitido para qualquer servidor externo |
| **Restrição** | O aplicativo não deve realizar qualquer conexão de rede durante o processamento de imagens |
| **Verificação** | Análise de tráfego de rede com Wireshark durante uma sessão completa de busca |

---

### RNF-006 · Integridade dos Arquivos Originais

| Campo | Valor |
|---|---|
| **Prioridade** | Alta (crítico) |
| **Descrição** | Nenhum arquivo na pasta de origem pode ser modificado, movido ou excluído durante a operação padrão do sistema |
| **Regra** | A operação padrão é sempre cópia. Mover e excluir são operações opcionais e precisam de confirmação explícita do usuário |
| **Verificação** | Verificar hash MD5 de todos os arquivos da origem antes e depois de uma sessão completa |

---

### RNF-007 · Banco de Dados Local Criptografado

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Descrição** | O banco de dados SQLite local (histórico, embeddings) deve ser armazenado em local seguro do sistema operacional |
| **Meta** | Dados salvos no diretório de dados do usuário (ex: `AppData` no Windows, `~/.config` no Linux) |
| **Verificação** | Verificar localização do arquivo de banco de dados após instalação |

---

## Categoria 3 — Usabilidade

### RNF-008 · Curva de Aprendizado

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | Um usuário leigo (sem conhecimento técnico) deve conseguir completar sua primeira busca sem ler documentação |
| **Meta** | Tarefa completa em menos de 5 minutos na primeira utilização |
| **Verificação** | Teste de usabilidade com 3 usuários não técnicos |

---

### RNF-009 · Mensagens de Erro Amigáveis

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | Todas as mensagens de erro devem ser escritas em linguagem acessível, explicando o que aconteceu e sugerindo o que fazer |
| **Proibido** | Exibir stack traces, códigos de erro técnicos ou mensagens em inglês para o usuário final |
| **Verificação** | Revisão de todas as mensagens de erro pelo agente `@UIUX` |

---

### RNF-010 · Internacionalização (i18n)

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Descrição** | O sistema deve ser desenvolvido com suporte a múltiplos idiomas, mesmo que o v1.0 inclua apenas Português (BR) e Inglês |
| **Meta** | Nenhum texto hardcoded na interface; todos os textos em arquivos de tradução separados |
| **Verificação** | Build do aplicativo em inglês funcional sem alterações no código |

---

### RNF-011 · Acessibilidade

| Campo | Valor |
|---|---|
| **Prioridade** | Baixa |
| **Descrição** | A interface deve respeitar princípios básicos de acessibilidade |
| **Metas** | Contraste de cores mínimo WCAG AA; todos os botões com labels descritivos; navegação por teclado nos fluxos principais |
| **Verificação** | Revisão automática com ferramenta de acessibilidade (axe, Lighthouse) |

---

## Categoria 4 — Confiabilidade

### RNF-012 · Tolerância a Falhas no Processamento

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | Uma foto corrompida ou em formato inesperado não deve interromper o processamento das demais |
| **Comportamento** | Arquivo problemático é ignorado com registro em log; processamento continua |
| **Verificação** | Inserir arquivo corrompido propositalmente no acervo e verificar que as demais fotos são processadas |

---

### RNF-013 · Log de Erros e Diagnóstico

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Descrição** | O sistema deve gerar um arquivo de log estruturado de cada sessão para diagnóstico em caso de falha |
| **Conteúdo do log** | Timestamp, arquivo processado, erro encontrado (se houver), resultado |
| **Localização** | Diretório de logs do sistema operacional (`AppData/FacePhoto/logs`) |
| **Verificação** | Verificar geração e conteúdo do log após sessão com erros simulados |

---

### RNF-014 · Recuperação Após Interrupção

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Descrição** | Se o processamento for interrompido (cancelamento ou fechamento inesperado), o sistema deve recuperar os resultados já obtidos na próxima abertura |
| **Verificação** | Fechar o aplicativo durante processamento e reabrir; verificar que resultados parciais são exibidos |

---

## Categoria 5 — Portabilidade e Compatibilidade

### RNF-015 · Suporte Multiplataforma

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Sistemas suportados** | Windows 10/11 (64-bit), macOS 12 Monterey ou superior, Ubuntu 22.04 LTS ou superior |
| **Meta** | Instalador nativo para cada plataforma (`.exe` para Windows, `.dmg` para macOS, `.AppImage` ou `.deb` para Linux) |
| **Verificação** | Build e teste funcional em máquina virtual de cada plataforma |

---

### RNF-016 · Auto-detecção de Hardware de Aceleração

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Descrição** | O sistema deve detectar automaticamente o melhor dispositivo de processamento disponível sem configuração manual |
| **Prioridade de detecção** | NVIDIA CUDA → AMD ROCm → Apple Metal (MPS) → CPU |
| **Verificação** | Teste em máquina com GPU NVIDIA, depois com GPU desabilitada; verificar que processamento usa a opção correta em cada caso |

---

### RNF-017 · Requisitos Mínimos de Hardware

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Processador** | Intel Core i5 ou AMD Ryzen 5 (geração 2017 ou posterior) |
| **RAM mínima** | 8 GB |
| **RAM recomendada** | 16 GB ou mais para acervos grandes |
| **Armazenamento** | 2 GB livres para instalação (modelos de IA incluídos) |
| **GPU (opcional)** | NVIDIA com suporte a CUDA 11+ para aceleração |

---

## Categoria 6 — Manutenibilidade

### RNF-018 · Cobertura de Testes

| Campo | Valor |
|---|---|
| **Prioridade** | Alta |
| **Meta** | Cobertura de testes automatizados ≥ 80% nos módulos de core engine |
| **Verificação** | Relatório de coverage gerado em cada build |

---

### RNF-019 · Documentação de Código

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Meta** | Todas as funções públicas documentadas com docstrings (Google style); README atualizado a cada release |
| **Verificação** | Revisão de código no processo de pull request |

---

### RNF-020 · Modularidade do Motor de Reconhecimento

| Campo | Valor |
|---|---|
| **Prioridade** | Média |
| **Descrição** | O motor de reconhecimento facial deve ser encapsulado em interface abstrata para permitir troca do modelo (DeepFace → InsightFace) sem alterar o restante da aplicação |
| **Verificação** | Trocar o backend do motor e verificar que os demais módulos não precisam de alteração |

---

*Documento elaborado pelos agentes `@Analista` e `@Arquiteto` com base no questionário de levantamento de requisitos (25/07/2026).*
