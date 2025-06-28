// File: src/screens/TipagemSanguinea/Incluir.js
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  ActionSheetIOS,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import styles from './styles';
import { ID_PROCED_TIPAGEM } from '../../constants/procedimentos';

const ABO_TYPES = ['A', 'B', 'AB', 'O'];
const RH_TYPES  = ['+', '-'];

export default function Incluir() {
  const { exameId } = useRoute().params;
  const navigation  = useNavigation();

  const [abo,        setAbo]        = useState('');
  const [rh,         setRh]         = useState('');
  const [metodos,    setMetodos]    = useState([]);
  const [metodId,    setMetodId]    = useState(null);
  const [metodLabel, setMetodLabel] = useState('');
  const [loading,    setLoading]    = useState(true);

  // carrega metodologias
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/metodexame', { params: { idProced: ID_PROCED_TIPAGEM } });
        setMetodos(res.data);
      } catch (err) {
        console.error('Erro ao carregar metodologias', err);
        Alert.alert('Erro', 'Não foi possível carregar metodologias.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ActionSheet iOS / Picker Android
  const openAboSelector = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Sistema ABO', options: [...ABO_TYPES, 'Cancelar'], cancelButtonIndex: ABO_TYPES.length },
      idx => { if (idx < ABO_TYPES.length) setAbo(ABO_TYPES[idx]); }
    );
  };
  const openRhSelector = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { title: 'Fator RH', options: [...RH_TYPES, 'Cancelar'], cancelButtonIndex: RH_TYPES.length },
      idx => { if (idx < RH_TYPES.length) setRh(RH_TYPES[idx]); }
    );
  };
  const openMetodSelector = () => {
    if (!metodos.length) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Metodologia',
        options: [...metodos.map(m => m.nome), 'Cancelar'],
        cancelButtonIndex: metodos.length
      },
      idx => {
        if (idx < metodos.length) {
          setMetodId(metodos[idx].id);
          setMetodLabel(metodos[idx].nome);
        }
      }
    );
  };

  // salvar resultado
  async function handleSalvar() {
    if (!abo || !rh || !metodId) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    const resultado = `${abo}${rh}`;

    try {
      await api.put(`/resulsexame/${exameId}`, { resultado, idMetod: metodId });
      Alert.alert('Sucesso', 'Resultado salvo.', [
        {
          text: 'OK',
          onPress: () => navigation.pop(2)  // remove Incluir + Detalhes, ficando na Listagem
        }
      ]);
    } catch (err) {
      console.error('Falha ao salvar resultado:', err);
      Alert.alert('Erro', 'Não foi possível salvar o resultado.');
    }
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Ionicons name="medkit" size={48} color="#2e7d32" />
        <Text style={styles.headerText}>Incluir Resultado</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Sistema ABO */}
        <Text style={styles.label}>Sistema ABO:</Text>
        {Platform.OS === 'ios' ? (
          <TouchableOpacity style={local.select} onPress={openAboSelector}>
            <Text>{abo || 'Selecione...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={local.pickerWrapper}>
            <Picker selectedValue={abo} onValueChange={setAbo}>
              <Picker.Item label="Selecione..." value="" />
              {ABO_TYPES.map(v => <Picker.Item key={v} label={v} value={v} />)}
            </Picker>
          </View>
        )}

        {/* Fator RH */}
        <Text style={styles.label}>Fator RH:</Text>
        {Platform.OS === 'ios' ? (
          <TouchableOpacity style={local.select} onPress={openRhSelector}>
            <Text>{rh ? (rh === '+' ? 'Positivo (+)' : 'Negativo (-)') : 'Selecione...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={local.pickerWrapper}>
            <Picker selectedValue={rh} onValueChange={setRh}>
              <Picker.Item label="Selecione..." value="" />
              <Picker.Item label="Positivo (+)" value="+" />
              <Picker.Item label="Negativo (-)" value="-" />
            </Picker>
          </View>
        )}

        {/* Metodologia */}
        <Text style={styles.label}>Metodologia:</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2e7d32" />
        ) : Platform.OS === 'ios' ? (
          <TouchableOpacity
            style={[local.select, !metodos.length && { opacity: 0.5 }]}
            onPress={openMetodSelector}
            disabled={!metodos.length}
          >
            <Text>{metodLabel || 'Selecione...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={local.pickerWrapper}>
            <Picker
              selectedValue={metodId}
              onValueChange={v => {
                setMetodId(v);
                const sel = metodos.find(x => x.id === v);
                setMetodLabel(sel?.nome || '');
              }}
            >
              <Picker.Item label="Selecione..." value={null} />
              {metodos.map(m => (
                <Picker.Item key={m.id} label={m.nome} value={m.id} />
              ))}
            </Picker>
          </View>
        )}

        {/* Botão Salvar */}
        <TouchableOpacity style={styles.button} onPress={handleSalvar}>
          <Text style={styles.buttonText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  select: {
    height: 48, borderWidth: 1, borderColor: '#ccc',
    borderRadius: 6, justifyContent: 'center',
    paddingHorizontal: 12, marginBottom: 12,
  },
  pickerWrapper: {
    borderWidth: 1, borderColor: '#ccc',
    borderRadius: 6, overflow: 'hidden',
    marginBottom: 12,
  },
});
