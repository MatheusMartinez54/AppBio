// File: src/screens/Glicose/Cadastro.js

import { Picker } from '@react-native-picker/picker';
import { Platform, TouchableOpacity, View, Text } from 'react-native';

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  ActionSheetIOS,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import { cachePacienteTipagem } from '../../storage';
import styles from './styles';
import { ID_PROCED_GLICOSE } from '../../constants/procedimentos';

const SEX_LABEL = { M: 'Masculino', F: 'Feminino' };
const UF_LIST = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];
const OUTRO_VALUE = 'OUTRO';

export default function GlicoseCadastro() {
  const nav = useNavigation();

  // etapa 1
  const [cpfSearch, setCpfSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // etapa 2
  const [nome, setNome] = useState('');
  const [dataN, setDataN] = useState('');
  const [sexo, setSexo] = useState('M');
  const [rg, setRg] = useState('');
  const [rgUf, setRgUf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [locais, setLocais] = useState([]);
  const [locSelecionado, setLocSelecionado] = useState('');
  const [novoLocal, setNovoLocal] = useState('');
  const [observacao, setObservacao] = useState('');

  // máscaras
  const fmtCpf = (t) =>
    t
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})?/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a));
  const fmtData = (t) =>
    t
      .replace(/\D/g, '')
      .slice(0, 8)
      .replace(/(\d{2})(\d{2})(\d{4})?/, (_, d, m, y) => (y ? `${d}/${m}/${y}` : m ? `${d}/${m}` : d));
  const fmtTel = (t) =>
    t
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{2})(\d{1})(\d{4})(\d{4})?/, (_, dd, x, p1, p2) => (p2 ? `(${dd}) ${x} ${p1}-${p2}` : p1 ? `(${dd}) ${x} ${p1}` : `(${dd}) ${x}`));

  // carrega locais
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/loccolet');
        setLocais(data);
      } catch {}
    })();
  }, []);

  // seletores
  const openSexoSelector = () => {
    const opts = ['Masculino', 'Feminino', 'Cancelar'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: 'Selecione o sexo', options: opts, cancelButtonIndex: 2 }, (i) => {
        if (i === 0) setSexo('M');
        if (i === 1) setSexo('F');
      });
    } else {
      Alert.alert('Selecione o sexo', '', [
        { text: 'Masculino', onPress: () => setSexo('M') },
        { text: 'Feminino', onPress: () => setSexo('F') },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };
  const openUfSelector = () => {
    const opts = [...UF_LIST, 'Cancelar'];
    ActionSheetIOS.showActionSheetWithOptions({ title: 'Selecione o estado', options: opts, cancelButtonIndex: opts.length - 1 }, (i) => {
      if (i < UF_LIST.length) setRgUf(UF_LIST[i]);
    });
  };
  const openLocSelector = () => {
    if (Platform.OS !== 'ios') return;
    const labels = locais.map((l) => l.DESCRICAO);
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Local de Coleta', options: [...labels, 'Outro...', 'Cancelar'], cancelButtonIndex: labels.length + 1 },
      (i) => {
        if (i < labels.length) {
          setLocSelecionado(String(locais[i].id));
          setNovoLocal('');
        } else if (i === labels.length) {
          setLocSelecionado(OUTRO_VALUE);
          setNovoLocal('');
        }
      },
    );
  };

  // busca CPF
  const handleBuscarCpf = async () => {
    const digits = cpfSearch.replace(/\D/g, '');
    if (digits.length !== 11) {
      Alert.alert('Atenção', 'CPF precisa ter 11 dígitos.');
      return;
    }
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert('Offline', 'Sem internet.');
      setHasSearched(true);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get('/pessofis', { params: { cpf: digits } });
      setNome(data.NOMEPESSOA || '');
      if (data.DATANASCPES) {
        const [y, m, d] = data.DATANASCPES.split('-');
        setDataN(`${d}/${m}/${y}`);
      }
      setSexo((data.SEXO || 'M').startsWith('F') ? 'F' : 'M');
      setRg(String(data.RG || '').replace(/\D/g, ''));
      setRgUf((data.RG_UF || '').trim().toUpperCase());
      const tel = (data.NUMEROS || '').split(',')[0] || '';
      setTelefone(fmtTel(tel));
      Alert.alert('Encontrado', 'Dados preenchidos.');
    } catch (err) {
      err.response?.status === 404 ? Alert.alert('Não encontrado', 'CPF não cadastrado.') : Alert.alert('Erro', 'Falha ao consultar CPF.');
    } finally {
      setSearching(false);
      setHasSearched(true);
    }
  };

  // salvar
  const handleSalvar = async () => {
    // validação de todos os campos obrigatórios
    if (
      !cpfSearch ||
      !nome.trim() ||
      dataN.length !== 10 ||
      !sexo ||
      !rg.trim() ||
      !rgUf ||
      !telefone.trim() ||
      (!locSelecionado && !novoLocal.trim())
    ) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    const [d, m, y] = dataN.split('/');
    const payloadPac = {
      cpf: cpfSearch.replace(/\D/g, ''),
      nome: nome.trim(),
      dataNascimento: `${y}-${m}-${d}`,
      sexo,
      rg: rg.replace(/\D/g, ''),
      rgUf,
      telefone: telefone.replace(/\D/g, ''),
    };

    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      await cachePacienteTipagem(payloadPac);
      Alert.alert('Offline', 'Salvo localmente.');
      return nav.goBack();
    }

    try {
      const respPac = await api.post('/pacientes/novo', payloadPac);
      const idPac = respPac.data.idPaciente ?? respPac.data.idpaciente;

      let idLoc = null;
      if (locSelecionado === OUTRO_VALUE) {
        const rl = await api.post('/loccolet/novo', { descricao: novoLocal.trim() });
        idLoc = rl.data.id;
      } else idLoc = Number(locSelecionado);

      await api.post('/resulsexame/novo', {
        idAgenda: null,
        idProced: ID_PROCED_GLICOSE,
        idPaciente: idPac,
        idLocColet: idLoc,
        resultado: null,
        observacao,
        dataCole: new Date().toISOString().slice(0, 19).replace('T', ' '),
      });

      Alert.alert('Sucesso', 'Paciente e exame de glicose cadastrados!', [
        {
          text: 'OK',
          onPress: () => nav.goBack(),
        },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Erro', 'Falha no servidor.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safeContainer}>
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            {!hasSearched ? (
              <View style={styles.formContainer}>
                <Text style={styles.headerText}>Buscar CPF</Text>
                <TextInput
                  style={styles.input}
                  placeholder="XXX.XXX.XXX-XX"
                  value={cpfSearch}
                  onChangeText={(t) => setCpfSearch(fmtCpf(t))}
                  keyboardType="numeric"
                  maxLength={14}
                />
                <TouchableOpacity style={styles.button} onPress={handleBuscarCpf} disabled={searching}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Buscar</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.headerText}>Cadastrar Glicose</Text>
                <View style={styles.formContainer}>
                  <Text style={styles.label}>CPF:</Text>
                  <TextInput style={[styles.input, { backgroundColor: '#eee' }]} value={cpfSearch} editable={false} />
                  <Text style={styles.label}>Nome:</Text>
                  <TextInput style={styles.input} value={nome} onChangeText={setNome} />
                  <Text style={styles.label}>Data de Nasc.:</Text>
                  <TextInput style={styles.input} value={dataN} onChangeText={(t) => setDataN(fmtData(t))} keyboardType="numeric" maxLength={10} />
                  <Text style={styles.label}>Sexo:</Text>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity style={localStyles.select} onPress={openSexoSelector}>
                      <Text>{SEX_LABEL[sexo]}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={localStyles.pickerWrapper}>
                      <Picker selectedValue={sexo} onValueChange={(valor) => setSexo(valor)} mode="dropdown" style={{ height: 48 }}>
                        <Picker.Item label="Selecione o sexo" value="" />
                        <Picker.Item label="Masculino" value="M" />
                        <Picker.Item label="Feminino" value="F" />
                      </Picker>
                    </View>
                  )}

                  <Text style={styles.label}>RG:</Text>
                  <TextInput style={styles.input} value={rg} onChangeText={(t) => setRg(t.replace(/\D/g, ''))} keyboardType="numeric" />
                  <Text style={styles.label}>UF de Emissão:</Text>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity style={localStyles.select} onPress={openUfSelector}>
                      <Text>{rgUf || 'Selecione'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={localStyles.pickerWrapper}>
                      <Picker selectedValue={rgUf} onValueChange={setRgUf}>
                        <Picker.Item label="Selecione" value="" />
                        {UF_LIST.map((u) => (
                          <Picker.Item key={u} label={u} value={u} />
                        ))}
                      </Picker>
                    </View>
                  )}
                  <Text style={styles.label}>Telefone:</Text>
                  <TextInput
                    style={styles.input}
                    value={telefone}
                    onChangeText={(t) => setTelefone(fmtTel(t))}
                    keyboardType="phone-pad"
                    maxLength={16}
                  />
                  <Text style={styles.label}>Local de Coleta:</Text>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity style={localStyles.select} onPress={openLocSelector}>
                      <Text>
                        {!locSelecionado
                          ? 'Selecione'
                          : locSelecionado === OUTRO_VALUE
                          ? 'Outro...'
                          : locais.find((l) => String(l.id) === locSelecionado)?.DESCRICAO}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={localStyles.pickerWrapper}>
                      <Picker
                        selectedValue={locSelecionado}
                        onValueChange={(v) => {
                          setLocSelecionado(v);
                          if (v !== OUTRO_VALUE) setNovoLocal('');
                        }}
                      >
                        <Picker.Item label="Selecione" value="" />
                        {locais.map((l) => (
                          <Picker.Item key={l.id} label={l.DESCRICAO} value={String(l.id)} />
                        ))}
                        <Picker.Item label="Outro..." value={OUTRO_VALUE} />
                      </Picker>
                    </View>
                  )}
                  {locSelecionado === OUTRO_VALUE && (
                    <>
                      <Text style={styles.label}>Novo local:</Text>
                      <TextInput style={styles.input} value={novoLocal} onChangeText={setNovoLocal} />
                    </>
                  )}
                  <Text style={styles.label}>Observação:</Text>
                  <TextInput style={[styles.input, { height: 80 }]} value={observacao} onChangeText={setObservacao} multiline />

                  <TouchableOpacity style={styles.button} onPress={handleSalvar}>
                    <Text style={styles.buttonText}>Cadastrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const localStyles = StyleSheet.create({
  select: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 12,
  },
});
