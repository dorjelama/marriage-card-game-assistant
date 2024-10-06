import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, useColorScheme, TouchableWithoutFeedback, Keyboard, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RuleSet = {
    pointRate: number;
    seenPoints: number;
    unseenPoints: number;
    dubleeWinBonusPoints: number;
    foulPoints: number;
};

export default function SettingsScreen() {
    const [ruleSet, setRules] = useState<RuleSet>({
        pointRate: 0,
        seenPoints: 0,
        unseenPoints: 0,
        dubleeWinBonusPoints: 0,
        foulPoints: 0,
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const storedData = await AsyncStorage.getItem('ruleSet');
                if (storedData) {
                    setRules(JSON.parse(storedData));
                }
            } catch (error) {
                console.error('Failed to load data from AsyncStorage:', error);
            }
        };
        loadData();
    }, []);

    const handleChange = (name: keyof RuleSet, value: string) => {
        setRules({
            ...ruleSet,
            [name]: parseFloat(value) || 0,  // Convert input to a number
        });
    };

    const handleSubmit = async () => {
        try {
            await AsyncStorage.setItem('ruleSet', JSON.stringify(ruleSet));
            console.log('Rules saved:', ruleSet);
            Alert.alert("Rules Set");
        } catch (error) {
            console.error('Failed to save data to AsyncStorage:', error);
        }
    };

    const colorScheme = useColorScheme();
    const isDarkMode = colorScheme === 'dark';
    const styles = getStyles(isDarkMode);

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.container}>
                <Text style={styles.title}>Set Rules</Text>
                <Text style={styles.label}>Point Rate</Text>
                <TextInput
                    style={styles.input}
                    value={ruleSet.pointRate.toString()}
                    onChangeText={(text) => handleChange('pointRate', text)}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Seen Points</Text>
                <TextInput
                    style={styles.input}
                    value={ruleSet.seenPoints.toString()}
                    onChangeText={(text) => handleChange('seenPoints', text)}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Unseen Points</Text>
                <TextInput
                    style={styles.input}
                    value={ruleSet.unseenPoints.toString()}
                    onChangeText={(text) => handleChange('unseenPoints', text)}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Dublee Win Bonus Points</Text>
                <TextInput
                    style={styles.input}
                    value={ruleSet.dubleeWinBonusPoints.toString()}
                    onChangeText={(text) => handleChange('dubleeWinBonusPoints', text)}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Foul Points</Text>
                <TextInput
                    style={styles.input}
                    value={ruleSet.foulPoints.toString()}
                    onChangeText={(text) => handleChange('foulPoints', text)}
                    keyboardType="numeric"
                />

                <Button title="Save Settings" onPress={handleSubmit} />
            </View>
        </TouchableWithoutFeedback>
    );
}

const getStyles = (isDarkMode: boolean) =>
    StyleSheet.create({
        title: {
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 20,
            textAlign: 'center',
            color: isDarkMode ? 'white' : 'black',
            paddingTop: 8
        },
        container: {
            flex: 1,
            padding: 16,
            justifyContent: 'flex-start',
            backgroundColor: isDarkMode ? '#000' : '#fff',
            flexDirection: 'column',
            paddingTop: 40
        },
        label: {
            marginBottom: 8,
            fontSize: 16,
            fontWeight: 'bold',
            color: isDarkMode ? '#fff' : '#000',
        },
        input: {
            height: 40,
            borderColor: isDarkMode ? '#555' : '#ccc',
            borderWidth: 1,
            marginBottom: 12,
            paddingLeft: 8,
            color: isDarkMode ? '#fff' : '#000',
            backgroundColor: isDarkMode ? '#333' : '#fff',
        },
    });
