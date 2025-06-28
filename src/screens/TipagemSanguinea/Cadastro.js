// File: src/screens/TipagemSanguinea/Cadastro.js
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

import { ID_PROCED_TIPAGEM } from '../../constants/procedimentos'; // ← novo import

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
const OUTRO_VALUE = 'OUTRO'; // valor especial p/ “Outro...”

export default function TipagemCadastro() {
  const nav = useNavigation();

  /* estados principais -------------------------------------------------- */
  const [cpfSearch, setCpfSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [nome, setNome] = useState('');
  const [dataN, setDataN] = useState('');
  const [sexo, setSexo] = useState('M');
  const [rg, setRg] = useState('');
  const [rgUf, setRgUf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [observacao, setObservacao] = useState('');

  /* locais de coleta ----------------------------------------------------- */
  const [locais, setLocais] = useState([]); // [{id,DESCRICAO}]
  const [locSelecionado, setLocSelecionado] = useState('');
  const [novoLocal, setNovoLocal] = useState('');

  /* máscaras ------------------------------------------------------------- */
  const fmtCpf = (t) =>
    t
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})?/, (_, a, b, c, d) => (d ? `${a}.${b}.${c}-${d}` : c ? `${a}.${b}.${c}` : b ? `${a}.${b}` : a));
  const fmtData = (t) =>
    t
      .replace(/\D/g, '')
      .slice(0, 8)
      .replace(/(\d{2})(\d{2})(\d{4})?/, (_, a, b, c) => (c ? `${a}/${b}/${c}` : b ? `${a}/${b}` : a));
  const fmtTel = (t) =>
    t
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{2})(\d{1})(\d{4})(\d{4})?/, (_, dd, x, p1, p2) => (p2 ? `(${dd}) ${x} ${p1}-${p2}` : p1 ? `(${dd}) ${x} ${p1}` : `(${dd}) ${x}`));

  /* carregar lista de locais -------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/loccolet');
        setLocais(data); // data = [{id,DESCRICAO}]
      } catch (e) {
        console.log('Falha /loccolet', e);
      }
    })();
  }, []);

  /* ―――――― seletores Sexo / UF ―――――― */
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

  /* seletor iOS para Local ------------------------------------------------ */
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

  /* busca CPF ------------------------------------------------------------ */
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
      const rawSex = (data.SEXO || 'M').toString().trim().toUpperCase();
      setSexo(rawSex === 'F' ? 'F' : 'M');
      setRg(String(data.RG || '').replace(/\D/g, ''));
      setRgUf((data.RG_UF || '').toString().trim().toUpperCase());

      const firstTel = (data.NUMEROS || '').split(',')[0] || '';
      setTelefone(fmtTel(firstTel));

      Alert.alert('Encontrado', 'Dados preenchidos.');
    } catch (err) {
      err.response?.status === 404 ? Alert.alert('Não encontrado', 'CPF não cadastrado.') : Alert.alert('Erro', 'Falha ao consultar CPF.');
    } finally {
      setSearching(false);
      setHasSearched(true);
    }
  };

  /* salvar ---------------------------------------------------------------- */
  const handleSalvar = async () => {
    if (!cpfSearch || !nome || !dataN) {
      Alert.alert('Atenção', 'Preencha CPF, Nome e Data.');
      return;
    }
    if (!rg || !rgUf) {
      Alert.alert('Atenção', 'Preencha RG e UF.');
      return;
    }
    if (!telefone) {
      Alert.alert('Atenção', 'Preencha Telefone.');
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
      nav.goBack();
      return;
    }

    try {
      /* paciente --------------------------------------------------------- */
      const respPac = await api.post('/pacientes/novo', payloadPac);
      const idPaciente = respPac.data.id ?? respPac.data.idPaciente ?? null;

      /* local de coleta -------------------------------------------------- */
      let idLocColet = null;
      if (locSelecionado === OUTRO_VALUE) {
        if (!novoLocal.trim()) {
          Alert.alert('Atenção', 'Informe o novo local.');
          return;
        }
        const respLoc = await api.post('/loccolet/novo', { descricao: novoLocal.trim() });
        idLocColet = respLoc.data.id;
      } else if (locSelecionado) {
        idLocColet = Number(locSelecionado);
      }

      /* resulexame ------------------------------------------------------- */
      await api.post('/resulsexame/novo', {
        idAgenda: null,
        idProced: ID_PROCED_TIPAGEM, // vem da constante centralizada
        idPaciente,
        idLocColet,
        dataCole: new Date().toISOString().slice(0, 19).replace('T', ' '), // 'YYYY-MM-DD HH:mm:ss'
        observacao,
      });

      Alert.alert('Sucesso', 'Paciente e exame cadastrados!');
    } catch (e) {
      console.log(e.response?.data);
      Alert.alert('Erro', 'Falha no servidor.');
    } finally {
      nav.goBack();
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.safeContainer}>
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            {/* etapa 1 --------------------------------------------------- */}
            {!hasSearched && (
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
            )}

            {/* etapa 2 --------------------------------------------------- */}
            {hasSearched && (
              <>
                <Text style={styles.headerText}>Cadastrar / Editar Dados</Text>
                <View style={styles.formContainer}>
                  {/* CPF ------------------------------------------------ */}
                  <Text style={styles.label}>CPF:</Text>
                  <TextInput style={[styles.input, { backgroundColor: '#eee' }]} value={cpfSearch} editable={false} />

                  {/* Nome ---------------------------------------------- */}
                  <Text style={styles.label}>Nome:</Text>
                  <TextInput style={styles.input} value={nome} onChangeText={setNome} placeholder="Nome completo" />

                  {/* Data ---------------------------------------------- */}
                  <Text style={styles.label}>Data de Nascimento:</Text>
                  <TextInput
                    style={styles.input}
                    value={dataN}
                    onChangeText={(t) => setDataN(fmtData(t))}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numeric"
                    maxLength={10}
                  />

                  {/* Sexo ---------------------------------------------- */}
                  <Text style={styles.label}>Sexo:</Text>
                  <TouchableOpacity style={localStyles.select} onPress={openSexoSelector}>
                    <Text>{SEX_LABEL[sexo]}</Text>
                  </TouchableOpacity>

                  {/* RG ------------------------------------------------ */}
                  <Text style={styles.label}>RG:</Text>
                  <TextInput
                    style={styles.input}
                    value={rg}
                    onChangeText={(t) => setRg(t.replace(/\D/g, ''))}
                    placeholder="Somente dígitos"
                    keyboardType="numeric"
                  />

                  {/* UF ------------------------------------------------ */}
                  <Text style={styles.label}>UF de Emissão:</Text>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity style={localStyles.select} onPress={openUfSelector}>
                      <Text>{rgUf || 'Selecione o estado'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={localStyles.pickerWrapper}>
                      <Picker selectedValue={rgUf} onValueChange={(v) => setRgUf(v)} mode="dropdown" style={localStyles.picker}>
                        <Picker.Item label="Selecione o estado" value="" />
                        {UF_LIST.map((uf) => (
                          <Picker.Item key={uf} label={uf} value={uf} />
                        ))}
                      </Picker>
                    </View>
                  )}

                  {/* Telefone ----------------------------------------- */}
                  <Text style={styles.label}>Telefone:</Text>
                  <TextInput
                    style={styles.input}
                    value={telefone}
                    onChangeText={(t) => setTelefone(fmtTel(t))}
                    placeholder="(DD) 9 XXXX-XXXX"
                    keyboardType="phone-pad"
                    maxLength={16}
                  />

                  {/* Local de Coleta ---------------------------------- */}
                  <Text style={styles.label}>Local de Coleta:</Text>
                  {Platform.OS === 'ios' ? (
                    <TouchableOpacity style={localStyles.select} onPress={openLocSelector}>
                      <Text>
                        {locSelecionado === ''
                          ? 'Selecione...'
                          : locSelecionado === OUTRO_VALUE
                          ? 'Outro...'
                          : locais.find((l) => String(l.id) === locSelecionado)?.DESCRICAO ?? '---'}
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
                        <Picker.Item label="Selecione..." value="" />
                        {locais.map((l) => (
                          <Picker.Item key={l.id} label={l.DESCRICAO} value={String(l.id)} />
                        ))}
                        <Picker.Item label="Outro..." value={OUTRO_VALUE} />
                      </Picker>
                    </View>
                  )}

                  {/* campo “Outro” ------------------------------------ */}
                  {locSelecionado === OUTRO_VALUE && (
                    <>
                      <Text style={styles.label}>Descreva o novo local:</Text>
                      <TextInput style={styles.input} value={novoLocal} onChangeText={setNovoLocal} placeholder="Ex.: Coleta externa - Escola X" />
                    </>
                  )}

                  {/* Observação --------------------------------------- */}
                  <Text style={styles.label}>Observação:</Text>
                  <TextInput style={styles.input} value={observacao} onChangeText={setObservacao} placeholder="Observação opcional" />

                  {/* Salvar ------------------------------------------- */}
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

/* estilos locais */
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
  picker: { height: 42 },
});
