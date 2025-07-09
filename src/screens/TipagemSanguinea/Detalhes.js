// File: src/screens/TipagemSanguinea/Detalhes.js
import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Dialog from 'react-native-dialog';

import api from '../../services/api';
import styles from './styles';

/* utilidades */
const maskStatus = (s) => ({ PEND: 'Pendente', CONC: 'Concluído', CANC: 'Cancelado' }[s] ?? s);

function calcIdade(iso) {
  if (!iso) return '-';
  const n = new Date(iso);
  const h = new Date();
  let a = h.getFullYear() - n.getFullYear();
  let m = h.getMonth() - n.getMonth();
  let d = h.getDate() - n.getDate();
  if (d < 0) {
    m--;
    d += new Date(h.getFullYear(), h.getMonth(), 0).getDate();
  }
  if (m < 0) {
    a--;
    m += 12;
  }
  return `${a}a ${m}m ${d}d`;
}

export default function TipagemDetalhes() {
  const { exameId, pacienteId, origem } = useRoute().params;
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [paciente, setPaciente] = useState(null);
  const [exame, setExame] = useState(null);
  const [loading, setLoading] = useState(true);

  /* logo base64 */
  const [logo64, setLogo64] = useState('');

  /* cancelamento */
  const [showCancel, setShowCancel] = useState(false);
  const [motivo, setMotivo] = useState('');

  /* carrega logo uma vez */
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require('../../../assets/logo-fasiclin.png'));
      await asset.downloadAsync();
      const b64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLogo64(`data:image/png;base64,${b64}`);
    })();
  }, []);

  /* carrega dados */
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
        console.error('Falha ao carregar detalhes:', err);
        Alert.alert('Erro', 'Não foi possível carregar detalhes do exame.');
      } finally {
        setLoading(false);
      }
    })();
  }, [exameId, pacienteId, origem, isFocused]);

  /* PDF */
  async function handleGerarPDF() {
    if (!paciente || !exame) return;
    const html = `
      <html><head><meta charset="utf-8">
        <style>
          body{font-family:Arial,Helvetica,sans-serif;padding:28px;line-height:1.45}
          h1{color:#2e7d32;text-align:center;font-size:22px;margin:0 0 18px}
          h2{font-size:16px;color:#2e7d32;margin:24px 0 8px}
          p{margin:3px 0;font-size:13px}
          .lbl{font-weight:600}
        </style>
      </head><body>

        <div style="text-align:center;margin-bottom:16px;">
          <img src="${logo64}" style="width:180px"/>
        </div>

        <h1>Clínica Fasiclin – Tipagem Sanguínea</h1>

        <h2>Dados do paciente</h2>
        <p><span class="lbl">Nome:</span> ${paciente.nome}</p>
        <p><span class="lbl">Idade:</span> ${calcIdade(paciente.dataNascISO ?? paciente.dataNascimento)}</p>
        <p><span class="lbl">Data nasc.:</span> ${paciente.dataNascimento}</p>
        <p><span class="lbl">CPF:</span> ${paciente.cpf}</p>
        <p><span class="lbl">Telefone:</span> ${paciente.telefone ?? '-'}</p>

        <h2>Dados do exame</h2>
        <p><span class="lbl">Local de coleta:</span> ${exame.local}</p>
        <p><span class="lbl">Tipo sanguíneo:</span> ${exame.resultado || '-'}</p>
        <p><span class="lbl">Metodologia:</span> ${exame.metodoNome || '-'}</p>
        <p><span class="lbl">Status:</span> ${maskStatus(exame.status)}</p>
        ${exame.motivo ? `<p><span class="lbl">Motivo cancelamento:</span> ${exame.motivo}</p>` : ''}
        ${exame.observacao ? `<p><span class="lbl">Observação:</span> ${exame.observacao}</p>` : ''}
      </body></html>
    `;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      (await Sharing.isAvailableAsync()) ? await Sharing.shareAsync(uri) : Alert.alert('PDF gerado em:', uri);
    } catch {
      Alert.alert('Erro', 'Falha ao gerar o PDF');
    }
  }

  /* cancelar */
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

  /* loading / erro */
  if (loading)
    return (
      <SafeAreaView style={styles.safeContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </SafeAreaView>
    );
  if (!paciente || !exame)
    return (
      <SafeAreaView style={styles.safeContainer}>
        <Text style={styles.itemTitle}>Dados indisponíveis.</Text>
      </SafeAreaView>
    );

  /* render */
  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* cabeçalho */}
        <View style={styles.header}>
          <Ionicons name="medkit" size={48} color="#2e7d32" />
          <Text style={styles.headerText}>Detalhes do Paciente (Tipagem)</Text>
        </View>

        {/* conteúdo */}
        <View style={styles.content}>
          <LabelValor label="Nome" valor={paciente.nome} />
          <LabelValor label="Idade" valor={calcIdade(paciente.dataNascISO ?? paciente.dataNascimento)} />
          <LabelValor label="Data Nascimento" valor={paciente.dataNascimento} />
          <LabelValor label="CPF" valor={paciente.cpf} />
          <LabelValor label="Telefone" valor={paciente.telefone ?? '-'} />

          <LabelValor label="Local de Coleta" valor={exame.local} />
          <LabelValor label="Tipo Sanguíneo" valor={exame.resultado || '-'} negrito />
          {exame.metodoNome && <LabelValor label="Metodologia" valor={exame.metodoNome} />}

          <LabelValor label="Status" valor={maskStatus(exame.status)} />
          {exame.motivo && <LabelValor label="Motivo Cancelamento" valor={exame.motivo} />}
          {exame.observacao && <LabelValor label="Observação" valor={exame.observacao} />}
        </View>

        {/* botões */}
        <View style={styles.buttonContainer}>
          {exame.status === 'PEND' && (
            <>
              <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Incluir', { exameId, pacienteId })}>
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

      {/* diálogo motivo */}
      <Dialog.Container visible={showCancel}>
        <Dialog.Title>Cancelar exame</Dialog.Title>
        <Dialog.Description>Informe o motivo do cancelamento:</Dialog.Description>
        <Dialog.Input value={motivo} onChangeText={setMotivo} placeholder="Ex.: paciente ausente" />
        <Dialog.Button
          label="Voltar"
          onPress={() => {
            setShowCancel(false);
            setMotivo('');
          }}
        />
        <Dialog.Button label="Confirmar" onPress={confirmarCancel} />
      </Dialog.Container>
    </SafeAreaView>
  );
}

/* componente auxiliar */
function LabelValor({ label, valor, negrito }) {
  return (
    <>
      <Text style={styles.label}>{label}:</Text>
      <Text style={[styles.value, negrito && { fontWeight: 'bold' }]}>{valor}</Text>
    </>
  );
}
