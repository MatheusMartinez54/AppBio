// File: src/screens/Relatorios/relatorios.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

import api from '../../services/api';

/* util */
const maskStatus = (s) => ({ PEND: 'Pendente', CONC: 'Concluído', CANC: 'Cancelado' }[s] ?? s);

export default function Relatorios() {
  const isFocused = useIsFocused();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [procedures, setProcedures] = useState([
    { label: 'Tipagem', value: 4350, selected: false },
    { label: 'Glicose', value: 3027, selected: false },
  ]);
  const [locals, setLocals] = useState([]);

  /* logo base64 */
  const [logo64, setLogo64] = useState('');
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require('../../../assets/logo-fasiclin.png'));
      await asset.downloadAsync();
      const b64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLogo64(`data:image/png;base64,${b64}`);
    })();
  }, []);

  /* carrega locais */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/loccolet');
        setLocals(res.data.map((l) => ({ ...l, selected: false })));
      } catch (err) {
        console.error('Falha ao carregar locais:', err);
      }
    })();
  }, []);

  /* recarrega lista sempre que filtros mudam ou a aba volta ao foco */
  useEffect(() => {
    fetchReports();
  }, [isFocused, procedures, locals]);

  async function fetchReports() {
    setLoading(true);
    try {
      const procIds = procedures
        .filter((p) => p.selected)
        .map((p) => p.value)
        .join(',');
      const locIds = locals
        .filter((l) => l.selected)
        .map((l) => l.id)
        .join(',');
      const res = await api.get('/relatorios', {
        params: { procedimentos: procIds, locais: locIds },
      });
      const sorted = Array.isArray(res.data) ? res.data.sort((a, b) => a.id - b.id) : [];
      setData(sorted);
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      Alert.alert('Erro', 'Não foi possível carregar os relatórios.');
    } finally {
      setLoading(false);
    }
  }

  function toggleProcedure(idx) {
    const copy = [...procedures];
    copy[idx].selected = !copy[idx].selected;
    setProcedures(copy);
  }
  function toggleLocal(idx) {
    const copy = [...locals];
    copy[idx].selected = !copy[idx].selected;
    setLocals(copy);
  }

  /* gera PDF com logo + nome da clínica */
  async function handleGeneratePDF() {
    if (!data.length) {
      Alert.alert('Sem registros', 'Não há dados para gerar PDF.');
      return;
    }

    const rowsHtml = data
      .map((i) => {
        const procLabel = i.procedimentoNome || procedures.find((p) => p.value === i.idProced)?.label || i.idProced;
        const statusLabel = maskStatus(i.status);
        const resultado = i.resultado != null ? i.resultado : i.observacao != null ? i.observacao : '-';
        return `<tr><td>${i.id}</td><td>${procLabel}</td><td>${i.local}</td><td>${resultado}</td><td>${statusLabel}</td></tr>`;
      })
      .join('');

    const html = `
      <html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:28px;line-height:1.4}
          h1{color:#2e7d32;text-align:center;font-size:22px;margin:0 0 18px}
          table{border-collapse:collapse;width:100%;font-size:12px}
          th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
          th{background:#c8e6c9}
        </style>
      </head><body>

        <div style="text-align:center;margin-bottom:16px;">
          <img src="${logo64}" style="width:180px"/>
        </div>

        <h1>Clínica Fasiclin – Relatórios</h1>

        <table>
          <thead>
            <tr>
              <th>ID</th><th>Procedimento</th><th>Local</th><th>Resultado</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body></html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      (await Sharing.isAvailableAsync()) ? await Sharing.shareAsync(uri) : Alert.alert('PDF gerado em:', uri);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      Alert.alert('Erro', 'Falha ao gerar o PDF.');
    }
  }

  /* ---------- renderização da lista e filtros ---------- */
  function renderItem({ item }) {
    const procLabel = item.procedimentoNome || procedures.find((p) => p.value === item.idProced)?.label || item.idProced;
    const statusLabel = maskStatus(item.status);
    const resultado = item.resultado != null ? item.resultado : item.observacao != null ? item.observacao : '-';
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemTitle}>ID: {item.id}</Text>
        <Text style={styles.itemText}>Procedimento: {procLabel}</Text>
        <Text style={styles.itemText}>Local: {item.local}</Text>
        <Text style={styles.itemText}>Resultado: {resultado}</Text>
        <Text style={styles.itemText}>Status: {statusLabel}</Text>
      </View>
    );
  }

  function renderFilters() {
    return (
      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Procedimentos ({procedures.filter((p) => p.selected).length})</Text>
        <View style={styles.filterRow}>
          {procedures.map((p, idx) => (
            <TouchableOpacity key={p.value} style={styles.filterOption} onPress={() => toggleProcedure(idx)}>
              <Ionicons name={p.selected ? 'checkbox' : 'checkbox-outline'} size={20} color="#388e3c" />
              <Text style={styles.filterOptionText}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.filterLabel, { marginTop: 12 }]}>Locais ({locals.filter((l) => l.selected).length})</Text>
        <View style={styles.filterRow}>
          {locals.map((l, idx) => (
            <TouchableOpacity key={String(l.id)} style={styles.filterOption} onPress={() => toggleLocal(idx)}>
              <Ionicons name={l.selected ? 'checkbox' : 'checkbox-outline'} size={20} color="#388e3c" />
              <Text style={styles.filterOptionText}>{l.DESCRICAO}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.pdfButton} onPress={handleGeneratePDF}>
          <Ionicons name="document-text-outline" size={20} color="#fff" />
          <Text style={styles.pdfButtonText}>Gerar PDF</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* ---------- JSX ---------- */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text" size={48} color="#388e3c" />
        <Text style={styles.headerText}>Relatórios</Text>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#388e3c" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderFilters}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

/* ---------- estilos ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f5e9' },
  header: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
  },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#388e3c' },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterLabel: { fontWeight: 'bold', color: '#388e3c' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 8,
  },
  filterOptionText: { marginLeft: 4, color: '#388e3c' },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#388e3c',
    borderRadius: 6,
    paddingVertical: 10,
    marginTop: 16,
  },
  pdfButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  itemContainer: {
    backgroundColor: '#c8e6c9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2e7d32',
    marginBottom: 4,
  },
  itemText: { fontSize: 14, color: '#2e7d32', marginBottom: 2 },
});
