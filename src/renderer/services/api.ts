/**
 * Serviço de API HTTP e streaming SSE para comunicação do Frontend React com o Backend FastAPI.
 */

export const API_BASE_URL = 'http://127.0.0.1:8001';

export interface HardwareStatusDTO {
  device_type: string;
  name: string;
  has_gpu: boolean;
}

export interface PessoaDTO {
  id: string;
  nome: string;
  thumbnail_path?: string | null;
  criado_em: string;
  total_fotos_ref: number;
}

export interface SessaoDTO {
  id: string;
  nome_sessao?: string | null;
  pasta_origem: string;
  pasta_destino: string;
  threshold: number;
  status: string;
  total_fotos: number;
  total_duplicatas: number;
  total_encontradas: number;
  total_copiadas: number;
  dispositivo_proc?: string | null;
  iniciado_em: string;
  concluido_em?: string | null;
}

export interface ResultadoDTO {
  id: string;
  sessao_id: string;
  pessoa_id: string;
  caminho_foto: string;
  score: number;
  status: string;
  bounding_box?: { x: number; y: number; w: number; h: number } | null;
  hash_arquivo: string;
  caminho_destino?: string | null;
  encontrado_em: string;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function obterHardwareStatus(): Promise<HardwareStatusDTO> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/status`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.hardware && data.hardware.device_type) {
        return data.hardware;
      }
    }
  } catch (err) {
    console.warn('Backend status indisponível, usando fallback seguro:', err);
  }
  return { device_type: 'cuda', name: 'NVIDIA GeForce GTX 1650 (NVIDIA CUDA)', has_gpu: true };
}

export async function cadastrarPessoa(nome: string, fotos: string[]): Promise<PessoaDTO> {
  const res = await fetch(`${API_BASE_URL}/api/pessoas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome,
      fotos_referencia: fotos.map((f) => ({ caminho_original: f })),
    }),
  });
  if (!res.ok) throw new Error('Erro ao cadastrar pessoa');
  return res.json();
}

export async function criarSessao(
  pessoaIds: string[],
  pastaOrigem: string,
  pastaDestino: string,
  threshold: number = 0.6,
  nomeSessao?: string
): Promise<SessaoDTO> {
  const res = await fetch(`${API_BASE_URL}/api/sessoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome_sessao: nomeSessao,
      pessoa_ids: pessoaIds,
      pasta_origem: pastaOrigem,
      pasta_destino: pastaDestino,
      threshold,
    }),
  });
  if (!res.ok) throw new Error('Erro ao criar sessão de busca');
  return res.json();
}

export async function pausarSessao(sessaoId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}/pausar`, { method: 'POST' });
}

export async function retomarSessao(sessaoId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}/retomar`, { method: 'POST' });
}

export async function cancelarSessao(sessaoId: string): Promise<void> {
  await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}/cancelar`, { method: 'POST' });
}

export async function excluirSessao(sessaoId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Erro ao excluir busca do histórico');
}

export async function obterResultados(sessaoId: string): Promise<ResultadoDTO[]> {
  const res = await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}/resultados`);
  if (!res.ok) throw new Error('Erro ao obter resultados');
  return res.json();
}

export async function atualizarStatusResultado(
  sessaoId: string,
  resultadoId: string,
  novoStatus: string
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}/resultados/${resultadoId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: novoStatus }),
  });
  if (!res.ok) throw new Error('Erro ao atualizar status do resultado');
}

export async function selecionarPastaNativa(titulo: string = 'Selecione uma pasta'): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/utils/selecionar-pasta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.caminho || null;
    }
  } catch (err) {
    console.warn('Erro ao chamar seletor de pasta nativo no servidor local:', err);
  }
  return null;
}

export async function copiarResultados(
  sessaoId: string,
  resultadoIds: string[],
  subpastaPorPessoa: boolean = false
): Promise<{ total_copiadas: number; pasta_destino: string }> {
  const res = await fetch(`${API_BASE_URL}/api/sessoes/${sessaoId}/copiar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resultado_ids: resultadoIds,
      subpasta_por_pessoa: subpastaPorPessoa,
    }),
  });
  if (!res.ok) throw new Error('Erro ao copiar fotos');
  return res.json();
}

export interface SSEController {
  close: () => void;
}

export function conectarStreamSSE(
  sessaoId: string,
  onProgress: (data: any) => void,
  onCompleted: (data: any) => void,
  onError: (err: any) => void
): SSEController {
  let isManuallyClosed = false;
  let source: EventSource | null = null;
  let reconnectTimer: any = null;

  const connect = () => {
    if (isManuallyClosed) return;

    try {
      source = new EventSource(`${API_BASE_URL}/api/sessoes/${sessaoId}/stream`);

      source.onmessage = (event) => {
        try {
          if (!event.data) return;
          const data = JSON.parse(event.data);
          if (data.event === 'progress' || data.event === 'paused') {
            onProgress(data);
          } else if (data.event === 'completed' || data.event === 'cancelled') {
            onCompleted(data);
            if (source) source.close();
          }
        } catch (parseErr) {
          console.warn('Erro ao decodificar payload SSE:', parseErr);
        }
      };

      source.onerror = (err) => {
        console.warn('Conexão SSE interrompida (aguardando restabelecimento do sistema)...', err);
        onError(err);

        if (!isManuallyClosed) {
          if (source) {
            source.close();
            source = null;
          }
          // Tentar reconectar suavemente após 2 segundos se a máquina tiver acabado de acordar
          clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            if (!isManuallyClosed) {
              connect();
            }
          }, 2000);
        }
      };
    } catch (initErr) {
      console.warn('Falha ao abrir EventSource:', initErr);
      onError(initErr);
    }
  };

  connect();

  return {
    close: () => {
      isManuallyClosed = true;
      clearTimeout(reconnectTimer);
      if (source) {
        source.close();
        source = null;
      }
    },
  };
}

