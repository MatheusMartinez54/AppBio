// File: src/screens/Glicose/Incluir.js
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
  ActionSheetIOS,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import styles from '../TipagemSanguinea/styles';
import { ID_PROCED_GLICOSE } from '../../constants/procedimentos';

export default function IncluirGlicose() {
  const { exameId } = useRoute().params;
  const navigation = useNavigation();

  const [resultado,  setResultado]  = useState('');
  const [metodos,   setMetodos]    = useState([]);
  const [metodId,   setMetodId]    = useState(null);
  const [metodLabel,setMetodLabel] = useState('');
  const [loading,   setLoading]    = useState(true);

  // 1) carrega metodologias via API
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/metodexame', {
          params: { idProced: ID_PROCED_GLICOSE }
        });
        setMetodos(res.data);
      } catch (err) {
        console.error('Erro ao carregar metodologias', err);
        Alert.alert('Erro', 'Não foi possível carregar metodologias.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 2) iOS ActionSheet
  const openMetodSelector = () => {
    if (!metodos.length) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Metodologia',
        options: [...metodos.map(m=>m.nome), 'Cancelar'],
        cancelButtonIndex: metodos.length,
      },
      idx => {
        if (idx < metodos.length) {
          setMetodId(metodos[idx].id);
          setMetodLabel(metodos[idx].nome);
        }
      }
    );
  };

  // 3) salvar resultado + idMetod
  async function handleSalvar() {
    if (!resultado.trim()) {
      Alert.alert('Atenção', 'Informe o valor da glicose.');
      return;
    }
    if (isNaN(Number(resultado))) {
      Alert.alert('Atenção', 'Resultado deve ser um número.');
      return;
    }
    if (!metodId) {
      Alert.alert('Atenção', 'Selecione a metodologia.');
      return;
    }

    try {
      await api.put(`/resulsexame/${exameId}`, {
        resultado,
        idMetod: metodId    // << aqui
      });
      Alert.alert(
        'Sucesso',
        'Resultado salvo.',
        [{ text:'OK', onPress:() => navigation.pop(1) }]
      );
    } catch (err) {
      console.error('Erro ao salvar glicose:', err);
      Alert.alert('Erro', 'Falha ao salvar resultado.');
    }
  }

  return (
    <SafeAreaView style={styles.safeContainer}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Ionicons name="flask" size={48} color="#2e7d32" />
        <Text style={styles.headerText}>Incluir Resultado (Glicose)</Text>
      </View>

      <View style={styles.formContainer}>
        {/* Valor da Glicose */}
        <Text style={styles.label}>Valor da Glicose (mg/dL):</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex.: 85"
          keyboardType="numeric"
          value={resultado}
          onChangeText={setResultado}
          maxLength={3}
        />

        {/* Metodologia */}
        <Text style={styles.label}>Metodologia:</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#2e7d32" />
        ) : Platform.OS==='ios' ? (
          <TouchableOpacity
            style={[local.select, !metodos.length && {opacity:0.5}]}
            onPress={openMetodSelector}
            disabled={!metodos.length}
          >
            <Text>{metodLabel||'Selecione...'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={local.pickerWrapper}>
            <Picker
              selectedValue={metodId}
              onValueChange={v => {
                setMetodId(v);
                const sel = metodos.find(x=>x.id===v);
                setMetodLabel(sel?.nome||'');
              }}
            >
              <Picker.Item label="Selecione..." value={null} />
              {metodos.map(m=>(
                <Picker.Item key={m.id} label={m.nome} value={m.id}/>
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
    height:48,borderWidth:1,borderColor:'#ccc',
    borderRadius:6,justifyContent:'center',
    paddingHorizontal:12,marginBottom:12
  },
  pickerWrapper:{
    borderWidth:1,borderColor:'#ccc',
    borderRadius:6,overflow:'hidden',
    marginBottom:12
  }
});
