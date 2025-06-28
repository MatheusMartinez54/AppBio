// File: src/storage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './services/api';

// — chaves AsyncStorage —
const GLICOSE_PENDING_KEY = '@pendingPacientesGlicose';
const TIPAGEM_PENDING_KEY = '@pendingPacientesTipagem';
const GLICOSE_CACHE_KEY = '@pacientesCacheGlicose';
const TIPAGEM_CACHE_KEY = '@pacientesCacheTipagem';

// —————————————————————————————————————————————————————————————————————
//                          GLICOSE
// —————————————————————————————————————————————————————————————————————

/** Armazena um novo paciente de glicose para envio posterior (offline) */
export async function cachePacienteGlicose(paciente) {
  try {
    const raw = await AsyncStorage.getItem(GLICOSE_PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(paciente);
    await AsyncStorage.setItem(GLICOSE_PENDING_KEY, JSON.stringify(list));
    console.log('[Storage] Glicose cacheado:', paciente);
  } catch (e) {
    console.error('[Storage] Erro ao cachear (glicose):', e);
  }
}

/** Retorna array de pendentes de glicose */
export async function getPacientesPendentesGlicose() {
  try {
    const raw = await AsyncStorage.getItem(GLICOSE_PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Storage] Erro ao ler pendentes (glicose):', e);
    return [];
  }
}

/** Sincroniza (POST) todos os pacientes pendentes de glicose */
export async function syncPacientesGlicose() {
  try {
    const pendentes = await getPacientesPendentesGlicose();
    if (!pendentes.length) return;

    const enviados = [];
    for (const p of pendentes) {
      try {
        await api.post('/pacientes', p);
        enviados.push(p);
      } catch (_) {
        console.log('[Storage] Falha ao enviar (glicose):', p.nome);
      }
    }
    // só mantém os que não conseguiram enviar
    const restantes = pendentes.filter((p) => !enviados.includes(p));
    await AsyncStorage.setItem(GLICOSE_PENDING_KEY, JSON.stringify(restantes));
    console.log(`[Storage] Glicose sincronizados: ${enviados.length}`);
  } catch (e) {
    console.error('[Storage] Erro ao sync (glicose):', e);
  }
}

/** Armazena no cache local a lista online de pacientes de glicose */
export async function setPacientesCacheGlicose(lista) {
  try {
    await AsyncStorage.setItem(GLICOSE_CACHE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('[Storage] Erro ao salvar cache (glicose):', e);
  }
}

/** Retorna do cache local a última lista online de glicose */
export async function getPacientesCacheGlicose() {
  try {
    const raw = await AsyncStorage.getItem(GLICOSE_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Storage] Erro ao ler cache (glicose):', e);
    return [];
  }
}

// —————————————————————————————————————————————————————————————————————
//                          TIPAGEM SANGUÍNEA
// —————————————————————————————————————————————————————————————————————

/** Armazena um novo paciente de tipagem para envio posterior (offline) */
export async function cachePacienteTipagem(paciente) {
  try {
    const raw = await AsyncStorage.getItem(TIPAGEM_PENDING_KEY);
    const list = raw ? JSON.parse(raw) : [];
    list.push(paciente);
    await AsyncStorage.setItem(TIPAGEM_PENDING_KEY, JSON.stringify(list));
    console.log('[Storage] Tipagem cacheado:', paciente);
  } catch (e) {
    console.error('[Storage] Erro ao cachear (tipagem):', e);
  }
}

/** Retorna array de pendentes de tipagem */
export async function getPacientesPendentesTipagem() {
  try {
    const raw = await AsyncStorage.getItem(TIPAGEM_PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Storage] Erro ao ler pendentes (tipagem):', e);
    return [];
  }
}

/** Sincroniza (POST) todos os pacientes pendentes de tipagem */
export async function syncPacientesTipagem() {
  try {
    const pendentes = await getPacientesPendentesTipagem();
    if (!pendentes.length) return;

    const enviados = [];
    for (const p of pendentes) {
      try {
        await api.post('/pacientes', p);
        enviados.push(p);
      } catch (_) {
        console.log('[Storage] Falha ao enviar (tipagem):', p.nome);
      }
    }
    // só mantém os que não conseguiram enviar
    const restantes = pendentes.filter((p) => !enviados.includes(p));
    await AsyncStorage.setItem(TIPAGEM_PENDING_KEY, JSON.stringify(restantes));
    console.log(`[Storage] Tipagem sincronizados: ${enviados.length}`);
  } catch (e) {
    console.error('[Storage] Erro ao sync (tipagem):', e);
  }
}

/** Armazena no cache local a lista online de pacientes de tipagem */
export async function setPacientesCacheTipagem(lista) {
  try {
    await AsyncStorage.setItem(TIPAGEM_CACHE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('[Storage] Erro ao salvar cache (tipagem):', e);
  }
}

/** Retorna do cache local a última lista online de tipagem */
export async function getPacientesCacheTipagem() {
  try {
    const raw = await AsyncStorage.getItem(TIPAGEM_CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('[Storage] Erro ao ler cache (tipagem):', e);
    return [];
  }
}
