// File: src/screens/Relatorios/relatorios.js

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '../../services/api';

// Função para aplicar máscara de status
function maskStatus(status) {
  switch (status) {
    case 'PEND':
      return 'Pendente';
    case 'CONC':
      return 'Concluído';
    case 'CANC':
      return 'Cancelado';
    default:
      return status;
  }
}

export default function Relatorios() {
  const isFocused = useIsFocused();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [procedures, setProcedures] = useState([
    { label: 'Tipagem', value: 4350, selected: false },
    { label: 'Glicose', value: 3027, selected: false },
  ]);

  const [locals, setLocals] = useState([]);

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
      // Ordena pelo ID crescente (menor para maior)
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

  async function handleGeneratePDF() {
    if (!data.length) {
      Alert.alert('Sem registros', 'Não há dados para gerar PDF.');
      return;
    }
    const rowsHtml = data
      .map((item) => {
        const procLabel = item.procedimentoNome || procedures.find((p) => p.value === item.idProced)?.label || item.idProced;
        const statusLabel = maskStatus(item.status);
        // usa resultado, senão observacao (tipagem)
        const resultado = item.resultado != null ? item.resultado : item.observacao != null ? item.observacao : '-';
        return `
        <tr>
          <td>${item.id}</td>
          <td>${procLabel}</td>
          <td>${item.local}</td>
          <td>${resultado}</td>
          <td>${statusLabel}</td>
        </tr>`;
      })
      .join('');
    const html = `
      <html>
        <head><meta charset="utf-8"><title>Relatórios Filtrados</title></head>
        <body style="font-family:sans-serif;padding:20px">
          <h1 style="color:#388e3c">Relatórios</h1>
          <table border="1" cellpadding="6" cellspacing="0" width="100%" style="border-collapse:collapse">
            <thead>
              <tr style="background-color:#c8e6c9">
                <th>ID</th><th>Procedimento</th><th>Local</th><th>Resultado</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      else Alert.alert('Compartilhamento não disponível');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      Alert.alert('Erro', 'Falha ao gerar o PDF.');
    }
  }

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e8f5e9' },
  header: { paddingTop: 16, paddingBottom: 8, alignItems: 'center', backgroundColor: '#e8f5e9' },
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
  filterOption: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
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
  itemContainer: { backgroundColor: '#c8e6c9', padding: 16, borderRadius: 8, marginBottom: 12 },
  itemTitle: { fontWeight: 'bold', fontSize: 16, color: '#2e7d32', marginBottom: 4 },
  itemText: { fontSize: 14, color: '#2e7d32', marginBottom: 2 },
});
