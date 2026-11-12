import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { ErroHttp, TABELA_ERROS, falhar, desembrulhar } from '../src/api/erros.js';

const SRC = fileURLToPath(new URL('../src/', import.meta.url));

test('falhar usa o status da tabela e guarda erro, mensagem e extras', () => {
  for (const [codigo, status] of Object.entries(TABELA_ERROS)) {
    assert.throws(() => falhar(codigo, 'msg', { a: 1 }), (e) => {
      assert.ok(e instanceof ErroHttp);
      assert.equal(e.status, status);
      assert.equal(e.erro, codigo);
      assert.equal(e.message, 'msg');
      assert.deepEqual(e.extra, { a: 1 });
      return true;
    });
  }
});

test('falhar com código fora da tabela lança erro claro (não ErroHttp)', () => {
  assert.throws(() => falhar('codigo_que_nao_existe', 'x'), (e) => {
    assert.ok(!(e instanceof ErroHttp));
    assert.match(e.message, /codigo_que_nao_existe.*TABELA_ERROS/);
    return true;
  });
});

test('desembrulhar devolve a jornada ou converte o erro com extra.jornada', () => {
  const j = { jornada_id: 'J-1' };
  assert.equal(desembrulhar({ jornada: j }), j);
  assert.throws(() => desembrulhar({ erro: 'campos_pendentes', mensagem: 'faltam', jornada: j }), (e) => {
    assert.equal(e.status, 422);
    assert.equal(e.erro, 'campos_pendentes');
    assert.deepEqual(e.extra, { jornada: j });
    return true;
  });
  assert.throws(() => desembrulhar({ erro: 'jornada_nao_encontrada', mensagem: 'm' }), (e) => {
    assert.equal(e.status, 404);
    assert.deepEqual(e.extra, {});
    return true;
  });
});

function arquivos(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? arquivos(join(dir, d.name)) : d.name.endsWith('.js') ? [join(dir, d.name)] : []);
}

test('todo código de erro produzível no código existe na tabela', () => {
  const codigos = new Set();
  for (const f of arquivos(SRC)) {
    const txt = readFileSync(f, 'utf8');
    for (const m of txt.matchAll(/falhar\(\s*'([a-z_]+)'/g)) codigos.add(m[1]);
    // resultados de domínio: `erro: 'codigo'`
    for (const m of txt.matchAll(/\berro:\s*'([a-z_]+)'/g)) codigos.add(m[1]);
  }
  codigos.delete('erro_interno'); // 500 genérico, tratado fora da tabela
  assert.ok(codigos.size > 10);
  for (const c of codigos) assert.ok(c in TABELA_ERROS, `código "${c}" falta em TABELA_ERROS`);
});

test('o domínio não carrega status HTTP e ErroHttp só nasce em erros.js', () => {
  const arquivosJornada = arquivos(join(SRC, 'dados/jornada'));
  assert.ok(arquivosJornada.length >= 6, 'dados/jornada/ deve ter os módulos da divisão');
  for (const f of arquivosJornada) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /\bstatus:\s*\d{3}/, f);
  }
  for (const f of arquivos(join(SRC, 'api'))) {
    if (f.endsWith('erros.js')) continue;
    assert.doesNotMatch(readFileSync(f, 'utf8'), /new ErroHttp\(/, f);
  }
});
