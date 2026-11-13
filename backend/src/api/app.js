import { dados } from '../dados/carga.js';
import { criarRoteador } from './roteador.js';
import { registrarRotasCidadaos } from './rotas/cidadaos.js';
import { registrarRotasServicos } from './rotas/servicos.js';
import { registrarRotasConsentimentos } from './rotas/consentimentos.js';
import { registrarRotasJornadas } from './rotas/jornadas.js';
import { registrarRotasEventos } from './rotas/eventos.js';
import { registrarRotasFixados } from './rotas/fixados.js';
import { registrarRotasRecomendacao } from './rotas/recomendacao.js';
import { registrarRotasCatalogo } from './rotas/catalogo.js';
import { gerarIndice } from './indice.js';
import { quantosDemo } from '../dados/demo.js';

export { ErroHttp } from './erros.js';

/**
 * Monta a API. Devolve `tratar({ metodo, caminho, consulta, corpo })` => `{ status, corpo }`.
 * Duas áreas, as únicas que o Kodiak chama: `/dados/*` (motor de dados) e `/recomendacao/*` (motor de recomendação).
 */
export function criarApp(derivados) {
  const { rota, tratar, rotas } = criarRoteador();

  rota(['GET'], '/health', () => ({ ok: true, cidadaos: dados.cidadaos.size - quantosDemo(), servicos: dados.servicos.size, derivados_gerados_em: derivados.gerado_em }));

  registrarRotasCidadaos(rota);
  registrarRotasServicos(rota);
  registrarRotasConsentimentos(rota);
  registrarRotasJornadas(rota);
  registrarRotasEventos(rota);
  registrarRotasFixados(rota);
  registrarRotasRecomendacao(rota, derivados);
  registrarRotasCatalogo(rota);
  // O índice vem das rotas registradas; por isso é registrado depois das áreas.
  rota(['GET'], '', () => gerarIndice(rotas()));
  return tratar;
}
