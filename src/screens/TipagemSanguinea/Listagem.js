import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  FlatList, ActivityIndicator,
  Alert, StyleSheet
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';
import styles from './styles';

const PENDING_KEY = '@pacientes_offline_tipagem';
const ID_PROCED_TIPAGEM = 4350;  // ajuste conforme seu DB

function fmtIsoToBr(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.substring(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export default function TipagemListagem() {
  const navigation = useNavigation();
  const isFocused  = useIsFocused();

  const [exames, setExames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    async function loadExames() {
      setLoading(true);
      setHasError(false);

      try {
        const { isConnected } = await NetInfo.fetch();
        const rawPending = await AsyncStorage.getItem(PENDING_KEY);
        const pendentes = rawPending ? JSON.parse(rawPending) : [];

        if (isConnected) {
          // sincroniza pendentes
          for (let p of pendentes) {
            try { await api.post('/resulsexame/novo', p); } catch (_) {}
          }
          await AsyncStorage.removeItem(PENDING_KEY);

          // busca online
          const res = await api.get('/resulsexame', {
            params: { idProced: ID_PROCED_TIPAGEM }
          });
          const online = Array.isArray(res.data) ? res.data : [];
          setExames(online.map(e => ({ ...e, origem: 'online' })));
        } else {
          // offline
          setExames(pendentes.map((p, i) => ({
            ...p,
            origem: 'offline',
            _offlineKey: i,
          })));
          Alert.alert('Offline','Mostrando cadastros locais pendentes.');
        }
      } catch (err) {
        console.error('Erro ao carregar exames de Tipagem:', err);
        setHasError(true);
      } finally {
        setLoading(false);
      }
    }

    if (isFocused) loadExames();
  }, [isFocused]);

  function handleCadastrar() {
    navigation.navigate('TipagemCadastro');
  }

  function handleDetalhes(item) {
    navigation.navigate('TipagemDetalhes', {
      exameId:    item.id,
      pacienteId: item.idPaciente,
      origem:     item.origem,
    });
  }

  // ← aqui adicionamos CANC
  const getCardStyle = item => {
    if (item.origem === 'offline')      return [styles.itemContainer, { backgroundColor: '#ffe0b2' }];  // laranja pálido
    if (item.status === 'CANC')         return [styles.itemContainer, { backgroundColor: '#ffcdd2' }];  // vermelho pálido
    if (item.status === 'CONC')         return [styles.itemContainer, { backgroundColor: '#c8e6c9' }];  // verde pálido
    return styles.itemContainer;                                                              // padrão branco
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="medkit" size={48} color="#2e7d32" />
        <Text style={styles.headerText}>Tipagem Sanguínea</Text>
      </View>
      <View style={styles.body}>
        <TouchableOpacity style={styles.cadastrarButton} onPress={handleCadastrar}>
          <Text style={styles.buttonText}>Cadastrar Paciente</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#2e7d32" />
        ) : hasError ? (
          <View style={localStyles.messageContainer}>
            <Text style={localStyles.messageText}>Não foi possível carregar exames.</Text>
          </View>
        ) : exames.length === 0 ? (
          <View style={localStyles.messageContainer}>
            <Text style={localStyles.messageText}>Nenhum exame de Tipagem encontrado.</Text>
          </View>
        ) : (
          <FlatList
            data={exames}
            keyExtractor={(item, idx) =>
              item.id != null
                ? `online-${item.id}`
                : `offline-${item._offlineKey}`
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={getCardStyle(item)}
                onPress={() => handleDetalhes(item)}
              >
                <Text style={styles.itemTitle}>{item.nomePaciente}</Text>
                <Text style={styles.itemText}>Data: {fmtIsoToBr(item.dataColeta)}</Text>
                <Text style={styles.itemText}>Status: {item.status}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  messageContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20
  },
  messageText: {
    fontSize: 18, color: '#555', textAlign: 'center'
  }
});
