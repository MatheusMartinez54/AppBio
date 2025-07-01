import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Dialog from 'react-native-dialog';

import api from '../../services/api';
import styles from './styles';

export default function TipagemDetalhes() {
  const { exameId, pacienteId, origem } = useRoute().params;
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [paciente, setPaciente] = useState(null);
  const [exame, setExame] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCancel, setShowCancel] = useState(false);
  const [motivo, setMotivo] = useState('');

  // sempre que a tela entrar em foco, recarrega os detalhes
  useEffect(() => {
    if (origem === 'offline') {
      Alert.alert('Offline', 'Registro ainda não sincronizado.');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const { data: ex } = await api.get(`/resulsexame/${exameId}`);
        setExame(ex);
        const { data: pc } = await api.get(`/pacientes/${pacienteId}`);
        setPaciente(pc);
      } catch (err) {
        console.error('Falha ao carregar detalhes:', err);
        Alert.alert('Erro', 'Não foi possível carregar detalhes do exame.');
      } finally {
        setLoading(false);
      }
    })();
  }, [exameId, pacienteId, origem, isFocused]);

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

  async function handleGerarPDF() {
    if (!paciente || !exame) return;
    const html = `
      <html><body style="font-family:sans-serif;padding:20px">
        <h1 style="color:#2e7d32">Detalhes do Paciente</h1>
        <p><strong>Nome:</strong> ${paciente.nome}</p>
        <p><strong>Data Nascimento:</strong> ${paciente.dataNascimento}</p>
        <p><strong>CPF:</strong> ${paciente.cpf}</p>
        <p><strong>Telefone:</strong> ${paciente.telefone ?? '-'}</p>
        <p><strong>Local de Coleta:</strong> ${exame.local}</p>
        <p><strong>Observação:</strong> ${exame.observacao || '-'}</p>
        <p><strong>Tipo Sanguíneo:</strong> ${exame.resultado || '-'}</p>
        <p><strong>Metodologia:</strong> ${exame.metodoNome || '-'}</p>
        <p><strong>Status:</strong> ${exame.status}</p>
        ${exame.motivo ? `<p><strong>Motivo Cancelamento:</strong> ${exame.motivo}</p>` : ''}
      </body></html>
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
          <Ionicons name="medkit" size={48} color="#2e7d32" />
          <Text style={styles.headerText}>Detalhes do Paciente</Text>
        </View>

        {/* Conteúdo */}
        <View style={styles.content}>
          <LabelValor label="Nome" valor={paciente.nome} />
          <LabelValor label="Data Nascimento" valor={paciente.dataNascimento} />
          <LabelValor label="CPF" valor={paciente.cpf} />

          <LabelValor label="Telefone" valor={paciente.telefone ?? '-'} />

          <LabelValor label="Local de Coleta" valor={exame.local} />
          <LabelValor label="Observação" valor={exame.observacao || '-'} />
          <LabelValor label="Tipo Sanguíneo" valor={exame.resultado || '-'} negrito />
          {/* Método utilizado (nome) */}
          {exame.metodoNome && <LabelValor label="Metodologia" valor={exame.metodoNome} />}

          <LabelValor label="Status" valor={exame.status} />
          {exame.motivo && <LabelValor label="Motivo Cancelamento" valor={exame.motivo} />}
        </View>

        {/* Botões */}
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

      {/* diálogo de motivo */}
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

function LabelValor({ label, valor, negrito }) {
  return (
    <>
      <Text style={styles.label}>{label}:</Text>
      <Text style={[styles.value, negrito && { fontWeight: 'bold' }]}>{valor}</Text>
    </>
  );
}
