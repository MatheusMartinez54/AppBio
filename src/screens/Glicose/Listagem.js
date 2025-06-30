// File: src/screens/Glicose/Listagem.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, StyleSheet, TextInput } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import api from '../../services/api';
import styles from './styles';

const PENDING_KEY = '@pacientes_offline_glicose';
const ID_PROCED_GLICOSE = 3027; // ID do procedimento de glicose

function fmtIsoToBr(iso) {
  if (!iso) return '-';
  const [y, m, d] = iso.substring(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Máscara para exibir status legível
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

export default function GlicoseListagem() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [exames, setExames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [sortAlpha, setSortAlpha] = useState(false);

  useEffect(() => {
    async function loadExames() {
      setLoading(true);
      try {
        const { isConnected } = await NetInfo.fetch();
        const rawPending = await AsyncStorage.getItem(PENDING_KEY);
        const pendentes = rawPending ? JSON.parse(rawPending) : [];

        if (isConnected) {
          // sincroniza pendentes
          for (let p of pendentes) {
            try {
              await api.post('/resulsexame/novo', p);
            } catch (_) {}
          }
          await AsyncStorage.removeItem(PENDING_KEY);

          // busca do servidor
          const res = await api.get('/resulsexame', {
            params: { idProced: ID_PROCED_GLICOSE },
          });
          const online = Array.isArray(res.data) ? res.data : [];
          // ordena por data (mais recente primeiro)
          online.sort((a, b) => new Date(b.dataColeta) - new Date(a.dataColeta));
          setExames(online.map((e) => ({ ...e, origem: 'online' })));
        } else {
          // offline
          const off = pendentes.map((p, i) => ({
            ...p,
            origem: 'offline',
            _offlineKey: i,
          }));
          Alert.alert('Offline', 'Mostrando cadastros locais pendentes.');
          setExames(off);
        }
      } catch (err) {
        console.error('Erro ao carregar exames de Glicose:', err);
        Alert.alert('Erro', 'Falha ao carregar exames.');
      } finally {
        setLoading(false);
      }
    }

    if (isFocused) loadExames();
  }, [isFocused]);

  function handleCadastrar() {
    navigation.navigate('GlicoseCadastro');
  }

  function handleDetalhes(item) {
    navigation.navigate('GlicoseDetalhes', {
      exameId: item.id,
      pacienteId: item.idPaciente,
      origem: item.origem,
    });
  }

  // estilo do card conforme origem/status
  const getCardStyle = (item) => {
    if (item.origem === 'offline') return [styles.itemContainer, { backgroundColor: '#ffe0b2' }];
    if (item.status === 'CONC') return [styles.itemContainer, { backgroundColor: '#c8e6c9' }];
    if (item.status === 'CANC') return [styles.itemContainer, { backgroundColor: '#ffcdd2' }];
    return styles.itemContainer;
  };

  // filtra e ordena de acordo com busca e ordenação
  const displayedExames = exames
    .filter((item) => item.nomePaciente.toLowerCase().includes(searchText.toLowerCase()))
    .sort((a, b) => {
      if (sortAlpha) {
        return a.nomePaciente.localeCompare(b.nomePaciente);
      }
      // ordem original por data
      return new Date(b.dataColeta) - new Date(a.dataColeta);
    });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="flask" size={48} color="#2e7d32" />
        <Text style={styles.headerText}>Glicose</Text>
      </View>

      <View style={styles.body}>
        <TouchableOpacity style={styles.cadastrarButton} onPress={handleCadastrar}>
          <Text style={styles.buttonText}>Cadastrar Paciente</Text>
        </TouchableOpacity>

        {/* filtros: ordenação e busca */}
        <View style={localStyles.filtersContainer}>
          <TouchableOpacity style={localStyles.sortButton} onPress={() => setSortAlpha(!sortAlpha)}>
            <Text style={localStyles.sortButtonText}>{sortAlpha ? 'Mostrar por Data' : 'Ordenar A-Z'}</Text>
          </TouchableOpacity>
          <TextInput style={localStyles.searchInput} placeholder="Buscar por nome" value={searchText} onChangeText={setSearchText} />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2e7d32" />
        ) : displayedExames.length === 0 ? (
          <View style={localStyles.messageContainer}>
            <Text style={localStyles.messageText}>Nenhum exame de Glicose encontrado.</Text>
          </View>
        ) : (
          <FlatList
            data={displayedExames}
            keyExtractor={(item, idx) => (item.id != null ? `online-${item.id}` : `offline-${item._offlineKey}`)}
            renderItem={({ item }) => (
              <TouchableOpacity style={getCardStyle(item)} onPress={() => handleDetalhes(item)}>
                <Text style={styles.itemTitle}>{item.nomePaciente}</Text>
                <Text style={styles.itemText}>Data: {fmtIsoToBr(item.dataColeta)}</Text>
                <Text style={styles.itemText}>Status: {maskStatus(item.status)}</Text>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  sortButton: {
    backgroundColor: '#eee',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#333',
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
});
