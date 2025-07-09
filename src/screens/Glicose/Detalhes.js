// File: src/screens/Glicose/Detalhes.js
import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import Dialog from 'react-native-dialog';
import api from '../../services/api';
import styles from './styles';

/*────────────────────────────*/
/* Utilidades                  */
/*────────────────────────────*/
const maskStatus = (s) => ({ PEND: 'Pendente', CONC: 'Concluído', CANC: 'Cancelado' }[s] ?? s);

function calculaIdade(iso) {
  if (!iso) return '-';
  const nasc = new Date(iso);
  const hoje = new Date();

  let anos = hoje.getFullYear() - nasc.getFullYear();
  let meses = hoje.getMonth() - nasc.getMonth();
  let dias = hoje.getDate() - nasc.getDate();

  if (dias < 0) {
    meses--;
    dias += new Date(hoje.getFullYear(), hoje.getMonth(), 0).getDate();
  }
  if (meses < 0) {
    anos--;
    meses += 12;
  }

  return `${anos}a ${meses}m ${dias}d`;
}

/*────────────────────────────*/
/* Componente                  */
/*────────────────────────────*/
export default function GlicoseDetalhes() {
  const { exameId, pacienteId, origem } = useRoute().params;
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  /* estados */
  const [paciente, setPaciente] = useState(null);
  const [exame, setExame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logo64, setLogo64] = useState(''); // base64 da logo

  /* cancelamento */
  const [showCancel, setShowCancel] = useState(false);
  const [motivo, setMotivo] = useState('');

  /*────────── carrega logo uma vez ──────────*/
  useEffect(() => {
    (async () => {
      const asset = Asset.fromModule(require('../../../assets/logo-fasiclin.png'));
      await asset.downloadAsync();
      const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLogo64(`data:image/png;base64,${base64}`);
    })();
  }, []);

  /*────────── carrega dados ──────────*/
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

  /*────────── referência aplicada ──────────*/
  const referenciaAplicada = useMemo(() => {
    if (!exame?.referencias || !exame.resultado) return null;
    const v = parseFloat(exame.resultado);
    return exame.referencias.find((r) => v >= r.VALMIN && v <= r.VALMAX) || null;
  }, [exame]);

 /*────────── gera PDF ──────────*/
async function handleGerarPDF() {
  if (!paciente || !exame) return;

  /* referência + dica */
  const refHtml =
    exame.status === 'CONC' && referenciaAplicada
      ? `
        <h3 style="margin:20px 0 6px 0;">Referência aplicada</h3>
        <p><strong>${referenciaAplicada.DESCRICAO}</strong><br/>
           Intervalo: ${parseFloat(referenciaAplicada.VALMIN)} – ${parseFloat(
           referenciaAplicada.VALMAX,
         )} mg/dL</p>
        ${exame.dica ? `<p style="margin-top:6px;"><strong>Dica:</strong> ${exame.dica}</p>` : ''}
      `
      : '';

  /* HTML */
  const html = `
    <html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,Helvetica,sans-serif;padding:28px;line-height:1.45}
        h1{color:#2e7d32;text-align:center;font-size:22px;margin:0 0 18px}
        h2{font-size:16px;color:#2e7d32;margin:24px 0 8px}
        h3{font-size:14px;color:#2e7d32;margin:18px 0 4px}
        p{margin:3px 0;font-size:13px}
        .lbl{font-weight:600}
      </style>
    </head><body>

      <!-- Logo maior -->
      <div style="text-align:center;margin-bottom:16px;">
        <img src="${logo64}" style="width:180px"/>
      </div>

      <h1>Clínica Fasiclin – Resultado de Glicose</h1>

      <!-- Dados do paciente -->
      <h2>Dados do paciente</h2>
      <p><span class="lbl">Nome:</span> ${paciente.nome}</p>
      <p><span class="lbl">Idade:</span> ${calculaIdade(paciente.dataNascISO)}</p>
      <p><span class="lbl">Data nasc.:</span> ${paciente.dataNascimento}</p>
      <p><span class="lbl">CPF:</span> ${paciente.cpf}</p>
      <p><span class="lbl">Telefone:</span> ${paciente.telefone ?? '-'}</p>

      <!-- Dados do exame -->
      <h2>Dados do exame</h2>
      <p><span class="lbl">Local de coleta:</span> ${exame.local}</p>
      <p><span class="lbl">Jejum:</span> ${exame.jejum ? 'Sim' : 'Não'}</p>
      ${
        paciente.sexo?.startsWith('F')
          ? `<p><span class="lbl">Gestante:</span> ${exame.gestante ? 'Sim' : 'Não'}</p>`
          : ''
      }
      <p><span class="lbl">Valor da glicose:</span> ${exame.resultado || '-'} mg/dL</p>
      <p><span class="lbl">Metodologia:</span> ${exame.metodoNome || '-'}</p>
      <p><span class="lbl">Status:</span> ${maskStatus(exame.status)}</p>
      ${exame.motivo ? `<p><span class="lbl">Motivo cancelamento:</span> ${exame.motivo}</p>` : ''}
      ${exame.observacao ? `<p><span class="lbl">Observação:</span> ${exame.observacao}</p>` : ''}

      ${refHtml}
    </body></html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html });
    (await Sharing.isAvailableAsync())
      ? await Sharing.shareAsync(uri)
      : Alert.alert('PDF gerado em:', uri);
  } catch {
    Alert.alert('Erro', 'Falha ao gerar o PDF');
  }
}


  /*────────── cancelar exame ──────────*/
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

  /*────────── loading / erro ──────────*/
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

  /*────────── Render na tela ──────────*/
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
          {/* paciente */}
          <Text style={styles.label}>Nome:</Text>
          <Text style={styles.value}>{paciente.nome}</Text>

          <Text style={styles.label}>Idade:</Text>
          <Text style={styles.value}>{calculaIdade(paciente.dataNascISO)}</Text>

          <Text style={styles.value}>{paciente.dataCadastro ?? '-'}</Text>

          <Text style={styles.label}>Data Nascimento:</Text>
          <Text style={styles.value}>{paciente.dataNascimento}</Text>

          <Text style={styles.label}>CPF:</Text>
          <Text style={styles.value}>{paciente.cpf}</Text>

          <Text style={styles.label}>Telefone:</Text>
          <Text style={styles.value}>{paciente.telefone ?? '-'}</Text>

          {/* exame */}
          <Text style={[styles.label, { marginTop: 12 }]}>Local de Coleta:</Text>
          <Text style={styles.value}>{exame.local}</Text>

          <Text style={styles.label}>Jejum:</Text>
          <Text style={styles.value}>{exame.jejum ? 'Sim' : 'Não'}</Text>

          {paciente.sexo?.startsWith('F') && (
            <>
              <Text style={styles.label}>Gestante:</Text>
              <Text style={styles.value}>{exame.gestante ? 'Sim' : 'Não'}</Text>
            </>
          )}

          <Text style={styles.label}>Valor da Glicose:</Text>
          <Text style={styles.value}>{exame.resultado || '-'} mg/dL</Text>

          <Text style={styles.label}>Metodologia:</Text>
          <Text style={styles.value}>{exame.metodoNome || '-'}</Text>

          <Text style={styles.label}>Status:</Text>
          <Text style={styles.value}>{maskStatus(exame.status)}</Text>

          {exame.motivo && (
            <>
              <Text style={styles.label}>Motivo Cancelamento:</Text>
              <Text style={styles.value}>{exame.motivo}</Text>
            </>
          )}

          {exame.observacao && (
            <>
              <Text style={styles.label}>Observação:</Text>
              <Text style={styles.value}>{exame.observacao}</Text>
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

      {/* Diálogo cancelamento */}
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
