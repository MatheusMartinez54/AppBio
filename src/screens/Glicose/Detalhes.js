// File: src/screens/Glicose/Detalhes.js
import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Dialog from 'react-native-dialog';
import api from '../../services/api';
import styles from './styles';

export default function GlicoseDetalhes() {
  const { exameId, pacienteId, origem } = useRoute().params;
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [paciente, setPaciente] = useState(null);
  const [exame, setExame] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancel, setShowCancel] = useState(false);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (origem === 'offline') {
      Alert.alert('Offline', 'Registro ainda não sincronizado.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const [{ data: ex }, { data: pc }] = await Promise.all([api.get(`/resulsexame/${exameId}`), api.get(`/pacientes/${pacienteId}`)]);
        setExame(ex);
        setPaciente(pc);
      } catch (err) {
        console.error('Falha ao carregar detalhes glicose:', err);
        Alert.alert('Erro', 'Não foi possível carregar detalhes do exame.');
      } finally {
        setLoading(false);
      }
    })();
  }, [exameId, pacienteId, origem, isFocused]);

  // Pega só a referência que cobre o valor
  const referenciaAplicada = useMemo(() => {
    if (!exame?.referencias || !exame.resultado) return null;
    const v = parseFloat(exame.resultado);
    return exame.referencias.find((r) => v >= r.VALMIN && v <= r.VALMAX) || null;
  }, [exame]);

  async function handleGerarPDF() {
    if (!paciente || !exame) return;

    // somente a linha aplicada
    const refHtml = referenciaAplicada
      ? `
      <tr>
    <td>${referenciaAplicada.DESCRICAO}</td>
    <td>${parseFloat(referenciaAplicada.VALMIN)} – ${parseFloat(referenciaAplicada.VALMAX)}</td>
  </tr>
    `
      : '';

    const dicaHtml = exame.dica ? `<p class="section"><strong>Dica:</strong> ${exame.dica}</p>` : '';

    const html = `
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; padding: 20px; line-height: 1.5; }
          h1 { color: #2e7d32; margin-bottom: 0.3em; }
          p { margin: 0.3em 0; }
          .section { margin-top: 1.2em; }
          table { border-collapse: collapse; width: 100%; margin-top: 1em; }
          th, td { border: 1px solid #ccc; padding: 8px 12px; text-align: left; }
          th { background-color: #f0f0f0; }
          tr:nth-child(even) { background-color: #fafafa; }
        </style>
      </head>
      <body>
        <h1>Detalhes do Paciente (Glicose)</h1>
        <div class="section">
          <p><strong>Nome:</strong> ${paciente.nome}</p>
          <p><strong>Data Nascimento:</strong> ${paciente.dataNascimento}</p>
          <p><strong>CPF:</strong> ${paciente.cpf}</p>
          <p><strong>Telefone:</strong> ${paciente.telefone ?? '-'}</p>
          <p><strong>Local de Coleta:</strong> ${exame.local}</p>
          <p><strong>Observação:</strong> ${exame.observacao || '-'}</p>
          <p><strong>Valor da Glicose:</strong> ${exame.resultado || '-'} mg/dL</p>
          <p><strong>Metodologia:</strong> ${exame.metodoNome || '-'}</p>

          <p><strong>Status:</strong> ${exame.status}</p>
          ${exame.motivo ? `<p><strong>Motivo Cancelamento:</strong> ${exame.motivo}</p>` : ''}
        </div>

        ${
          exame.status === 'CONC' && referenciaAplicada
            ? `
          <div class="section">
            <h2>Referência Aplicada</h2>
            <table>
              <tr>
                <th>Tipo</th>
                <th>Intervalo (mg/dL)</th>
              </tr>
              ${refHtml}
            </table>
            ${dicaHtml}
          </div>
        `
            : ''
        }
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Compartilhamento não disponível');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao gerar o PDF');
    }
  }

  async function confirmarCancel() {
    if (!motivo.trim()) {
      Alert.alert('Atenção', 'Informe o motivo.');
      return;
    }
    try {
      await api.put(`/resulsexame/${exameId}/cancelar`, { motivo });
      Alert.alert('Sucesso', 'Exame cancelado.');
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Falha ao cancelar.');
    } finally {
      setShowCancel(false);
      setMotivo('');
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </SafeAreaView>
    );
  }
  if (!paciente || !exame) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <Text style={styles.itemTitle}>Dados indisponíveis.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Ionicons name="flask" size={48} color="#2e7d32" />
          <Text style={styles.headerText}>Detalhes do Paciente (Glicose)</Text>
        </View>

        {/* Conteúdo */}
        <View style={styles.content}>
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{paciente.nome}</Text>

          <Text style={styles.label}>Data Nascimento:</Text>
          <Text style={styles.value}>{paciente.dataNascimento}</Text>

          <Text style={styles.label}>CPF:</Text>
          <Text style={styles.value}>{paciente.cpf}</Text>

          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.value}>{paciente.telefone ?? '-'}</Text>

          <Text style={styles.label}>Local de Coleta:</Text>
          <Text style={styles.value}>{exame.local}</Text>

          <Text style={styles.label}>Observação:</Text>
          <Text style={styles.value}>{exame.observacao || '-'}</Text>

          <Text style={styles.label}>Valor da Glicose:</Text>
          <Text style={styles.value}>{exame.resultado || '-'} mg/dL</Text>

          <Text style={styles.label}>Metodologia:</Text>
          <Text style={styles.value}>{exame.metodoNome ?? '-'}</Text>

          <Text style={styles.label}>Status:</Text>
          <Text style={[styles.value, exame.status === 'CANC' && { color: '#c62828' }]}>{exame.status}</Text>

          {exame.motivo && (
            <>
              <Text style={styles.label}>Motivo Cancelamento:</Text>
              <Text style={styles.value}>{exame.motivo}</Text>
            </>
          )}

          {exame.status === 'CONC' && referenciaAplicada && (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Referência Aplicada:</Text>
              <Text style={styles.value}>
                • {referenciaAplicada.DESCRICAO}: {parseFloat(referenciaAplicada.VALMIN)}–{parseFloat(referenciaAplicada.VALMAX)} mg/dL
              </Text>
              {exame.dica && (
                <>
                  <Text style={[styles.label, { marginTop: 12 }]}>Dica:</Text>
                  <Text style={styles.value}>{exame.dica}</Text>
                </>
              )}
            </>
          )}
        </View>

        {/* Botões */}
        <View style={styles.buttonContainer}>
          {exame.status === 'PEND' && (
            <>
              <TouchableOpacity style={styles.button} onPress={() => navigation.replace('GlicoseIncluir', { exameId, pacienteId })}>
                <Text style={styles.buttonText}>Incluir Resultado</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#c62828' }]} onPress={() => setShowCancel(true)}>
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
          {exame.status === 'CONC' && (
            <TouchableOpacity style={styles.button} onPress={handleGerarPDF}>
              <Text style={styles.buttonText}>Gerar PDF</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.button, styles.backButton]} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Diálogo */}
      <Dialog.Container visible={showCancel}>
        <Dialog.Title>Cancelar exame</Dialog.Title>
        <Dialog.Description>Informe o motivo do cancelamento:</Dialog.Description>
        <Dialog.Input value={motivo} onChangeText={setMotivo} placeholder="Ex.: jejum não realizado" />
        <Dialog.Button label="Voltar" onPress={() => setShowCancel(false)} />
        <Dialog.Button label="Confirmar" onPress={confirmarCancel} />
      </Dialog.Container>
    </SafeAreaView>
  );
}
