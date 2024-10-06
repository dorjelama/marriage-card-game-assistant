import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, useColorScheme, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AddPlayersScreen() {

  const colorScheme = useColorScheme(); // Detect system's color scheme (light or dark)
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [players, setPlayers] = useState<string[]>(['', '', '']);

  const handlePlayerChange = (index: number, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index] = value;
    setPlayers(updatedPlayers);
  };

  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([...players, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 3) {
      const updatedPlayers = players.filter((_, i) => i !== index);
      setPlayers(updatedPlayers);
    }
  };

  const handleSubmit = async () => {
    const nonEmptyPlayers = players.filter(player => player.trim() !== '');

    if (nonEmptyPlayers.length < 3) {
      Alert.alert('Error', 'You must add at least 3 players.');
      return;
    }

    try {
      await AsyncStorage.setItem('players', JSON.stringify(nonEmptyPlayers));
      console.log('Form Data saved:', JSON.stringify(nonEmptyPlayers));
      Alert.alert('Success', 'Players saved successfully!');
    } catch (error) {
      console.error('Failed to save players to AsyncStorage:', error);
      Alert.alert('Error', 'Failed to save players. Please try again.');
    }
  };

  const loadPlayers = async () => {
    try {
      const storedPlayers = await AsyncStorage.getItem('players');
      if (storedPlayers) {
        const parsedPlayers = JSON.parse(storedPlayers);
        setPlayers(parsedPlayers);
      }
    } catch (error) {
      console.error('Failed to load players from AsyncStorage:', error);
    }
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Add Players</Text>
        {players.map((player, index) => (
          <View key={index} style={styles.playerContainer}>
            <TextInput
              style={styles.input}
              placeholder={`Player ${index + 1}`}
              value={player}
              onChangeText={(text) => handlePlayerChange(index, text)}
            />
            {players.length > 3 && (
              <TouchableOpacity onPress={() => removePlayer(index)} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, players.length >= 6 && styles.buttonDisabled]}
          onPress={addPlayer}
          disabled={players.length >= 6}
        >
          <Text style={styles.buttonText}>Add Player</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSubmit}>
          <Text style={styles.buttonText}>Save Players</Text>
        </TouchableOpacity>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
}

const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      justifyContent: 'flex-start',
      backgroundColor: isDarkMode ? '#000' : '#fff',
      paddingTop: 40
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: isDarkMode ? 'white' : 'black',
      paddingTop: 8
    },
    playerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    input: {
      flex: 1,
      height: 40,
      borderColor: '#ccc',
      borderWidth: 1,
      paddingLeft: 8,
      marginRight: 10,
      color: isDarkMode ? 'white' : 'black',
      backgroundColor: isDarkMode ? '#333' : '#fff',
    },
    button: {
      backgroundColor: isDarkMode ? '#007bff' : '#007bff',
      padding: 12,
      borderRadius: 5,
      alignItems: 'center',
      marginTop: 16,
    },
    buttonDisabled: {
      backgroundColor: '#a0a0a0',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    removeButton: {
      backgroundColor: '#ff4d4d',
      padding: 8,
      borderRadius: 5,
    },
    removeButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
  });
