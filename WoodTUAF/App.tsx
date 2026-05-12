import * as React from 'react';
import {StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';

import {HomeScreen} from './src/screens/home-screen';
import {ResultScreen} from './src/screens/result-screen';
import GuideScreen from './src/screens/GuideScreen';
import {HistoryScreen} from './src/screens/HistoryScreen';
import {WoodDetailScreen} from './src/screens/WoodDetailScreen';
import {WoodLibraryScreen} from './src/screens/WoodLibraryScreen';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              gestureEnabled: false,
            }}>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Guide" component={GuideScreen} />
            <Stack.Screen name="WoodLibrary" component={WoodLibraryScreen} />
            <Stack.Screen name="WoodDetail" component={WoodDetailScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default App;
