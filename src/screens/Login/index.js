// File: src/screens/Login/index.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../services/api'; // axios com baseURL
import styles from './styles';

export default function Login() {
  const navigation = useNavigation();
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');

  /* formata CPF em tempo real */
  function handleCpfChange(text) {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    let formatted = digits;
    if (digits.length > 3 && digits.length <= 6) formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    else if (digits.length > 6 && digits.length <= 9) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    else if (digits.length > 9) formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    setCpf(formatted);
  }

  /* efetua login */
  async function handleLogin() {
    const cpfDigits = cpf.replace(/\D/g, '');

    // Validações simples
    if (cpfDigits.length !== 11) {
      Alert.alert('Atenção', 'Informe um CPF válido (11 dígitos).');
      return;
    }
    if (!senha.trim()) {
      Alert.alert('Atenção', 'Informe a senha.');
      return;
    }

    console.log('[LOGIN] Enviando para backend →', { cpf: cpfDigits, senha });

    try {
      const { data } = await api.post('/auth-pro', { cpf: cpfDigits, senha });
      console.log('[LOGIN] Resposta do backend →', data);

      // Salva TOKEN e OBJETO profissional
      await AsyncStorage.multiSet([
        ['token', data.token],
        ['profissional', JSON.stringify(data.profissional)],
      ]);

      // navega para Home e limpa histórico
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      console.log('[LOGIN] Erro →', err.response?.data || err.message);
      const msg = err.response?.data?.message ? err.response.data.message : 'Falha ao conectar. Tente novamente.';
      Alert.alert('Erro', msg);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <Ionicons name="medkit" size={64} color="#2e7d32" />
              <Text style={styles.headerText}>Fasiclin Biomedicina</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>CPF</Text>
              <TextInput
                style={styles.input}
                placeholder="000.000.000-00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={cpf}
                onChangeText={handleCpfChange}
                maxLength={14}
              />

              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite sua senha"
                placeholderTextColor="#999"
                secureTextEntry
                value={senha}
                onChangeText={setSenha}
              />

              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <Text style={styles.loginButtonText}>Entrar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
