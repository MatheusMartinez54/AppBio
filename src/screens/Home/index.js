// File: src/screens/Home/index.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from './styles';

export default function Home() {
  const navigation = useNavigation();
  const [profissional, setProfissional] = useState(null);

  useEffect(() => {
    // a) Carrega dados do profissional logado
    AsyncStorage.getItem('profissional')
      .then(json => {
        if (json) setProfissional(JSON.parse(json));
        else {
          // se não encontrou, volta pro login
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      })
      .catch(console.error);
  }, []);

  // b) Função de logout
  async function handleLogout() {
    await AsyncStorage.multiRemove(['token', 'profissional']);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }]
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="medkit" size={64} color="#2e7d32" />
        <Text style={styles.headerText}>Fasiclin Biomedicina</Text>

        {/* botão de sair */}
        {profissional && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() =>
              Alert.alert(
                'Sair',
                'Deseja realmente sair?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sair', onPress: handleLogout }
                ]
              )
            }
          >
            <Ionicons name="exit-outline" size={24} color="#b71c1c" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        {/* saudação personalizada */}
        <Text style={styles.bodyTitle}>
          {profissional
            ? `Bem-vindo(a), ${profissional.nome}!`
            : 'Bem-vindo(a)!'}
        </Text>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => navigation.navigate('TipagemListagem')}
        >
          <Text style={styles.optionButtonText}>Tipagem Sanguínea</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => navigation.navigate('GlicoseListagem')}
        >
          <Text style={styles.optionButtonText}>Glicose</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionButton}
          onPress={() => navigation.navigate('Relatorios')}
        >
          <Text style={styles.optionButtonText}>Relatórios</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
