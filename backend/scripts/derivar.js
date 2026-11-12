// Regera data/derivados.json (próximo serviço, populares por perfil, picos de demanda).
import { carregarDados } from '../src/dados/carga.js';
import { construirDerivados } from '../src/recomendacao/derivados.js';

await carregarDados();
await construirDerivados();
