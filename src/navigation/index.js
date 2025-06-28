// File: src/navigation/RootNavigator.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import das telas
import Login from '../screens/Login';
import Home from '../screens/Home';
import TipagemListagem from '../screens/TipagemSanguinea/Listagem';
import TipagemCadastro from '../screens/TipagemSanguinea/Cadastro';
import TipagemDetalhes from '../screens/TipagemSanguinea/Detalhes';
import Incluir from '../screens/TipagemSanguinea/Incluir'; // ← nova import

import GlicoseListagem from '../screens/Glicose/Listagem';
import GlicoseCadastro from '../screens/Glicose/Cadastro';
import GlicoseDetalhes from '../screens/Glicose/Detalhes';
import Relatorios from '../screens/Relatorios/relatorios';
import GlicoseIncluir    from '../screens/Glicose/Incluir';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        {/* Autenticação */}
        <Stack.Screen name="Login" component={Login} />

        {/* Tela principal */}
        <Stack.Screen name="Home" component={Home} />

        {/* Tipagem Sanguínea */}
        <Stack.Screen name="TipagemListagem" component={TipagemListagem} options={{ title: 'Listagem de Tipagem' }} />
        <Stack.Screen name="TipagemCadastro" component={TipagemCadastro} options={{ title: 'Cadastrar Tipagem' }} />
        <Stack.Screen name="TipagemDetalhes" component={TipagemDetalhes} options={{ title: 'Detalhes da Tipagem' }} />
        <Stack.Screen name="Incluir" component={Incluir} options={{ title: 'Incluir Resultado' }} />

        {/* Glicose */}
        <Stack.Screen name="GlicoseListagem" component={GlicoseListagem} options={{ title: 'Listagem de Glicose' }} />
        <Stack.Screen name="GlicoseCadastro" component={GlicoseCadastro} options={{ title: 'Cadastrar Glicose' }} />
        <Stack.Screen name="GlicoseDetalhes" component={GlicoseDetalhes} options={{ title: 'Detalhes da Glicose' }} />
         <Stack.Screen name="GlicoseIncluir" component={GlicoseIncluir} options={{ title: 'Incluir Resultado' }}/>
        

        {/* Relatórios */}
        <Stack.Screen name="Relatorios" component={Relatorios} options={{ title: 'Relatórios' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
