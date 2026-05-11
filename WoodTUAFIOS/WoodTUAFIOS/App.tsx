/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */
import 'react-native-worklets-core'
import {NavigationContainer} from '@react-navigation/native';
import * as React from 'react';
import {createNativeStackNavigator} from "@react-navigation/native-stack";
import { HomeScreen } from './src/screens/home-screen';
import { ResultScreen } from './src/screens/result-screen';
import GuideScreen from './src/screens/GuideScreen';


const Stack = createNativeStackNavigator();

function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Home" screenOptions={{
                headerShown: false,
                gestureEnabled: false,
            }}>
                <Stack.Screen options={{headerShown: false}} name="Home" component={HomeScreen}/>
                <Stack.Screen name="Result" component={ResultScreen}/>
                <Stack.Screen name="Guide" component={GuideScreen}/>
            </Stack.Navigator>
        </NavigationContainer>
    );
}

export default App;
