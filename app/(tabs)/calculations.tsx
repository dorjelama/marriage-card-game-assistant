import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Switch, StyleSheet, ScrollView, Alert, TouchableOpacity, useColorScheme, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RadioGroup, { RadioButtonProps } from 'react-native-radio-buttons-group';

type RuleSet = {
  pointRate: number;
  seenPoints: number;
  unseenPoints: number;
  dubleeWinBonusPoints: number;
  foulPoints: number;
};
type PlayerData = {
  name: string;
  points: number;
  foul: boolean;
  dubleeOpened: boolean;
  seen: boolean;
};
type PlayerResult = {
  name: string;
  pointsCollected: number;
};

export default function CalculationsScreen() {
  const colorScheme = useColorScheme(); // Detect system's color scheme (light or dark)
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);

  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [rules, setRules] = useState<RuleSet>();
  const [radioButtonsData, setRadioButtonsData] = useState<RadioButtonProps[]>([]);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false); // State to manage pull-to-refresh


  // Pull-to-refresh handler
  const loadPlayers = async () => {
    try {
      const storedPlayers = await AsyncStorage.getItem('players');
      if (storedPlayers) {
        const parsedPlayers = JSON.parse(storedPlayers).map((name: string) => ({
          name,
          points: 0,
          foul: false,
          dubleeOpened: false,
          seen: false
        }));
        setPlayers(parsedPlayers);

        // Initialize radio buttons for winner selection
        const radioButtons = parsedPlayers.map((player: PlayerData, index: number) => ({
          id: `${index}`,
          label: player.name,
          value: `${index}`,
          selected: false,
        }));
        setRadioButtonsData(radioButtons);
      }
    } catch (error) {
      console.error('Failed to load players from AsyncStorage:', error);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPlayers(); // Re-fetch the games
    setRefreshing(false); // Stop the refreshing indicator
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  const handlePointsChange = (index: number, value: string) => {
    const updatedPlayers = [...players];
    updatedPlayers[index].points = parseInt(value) || 0;
    updatedPlayers[index].seen = true; // Toggle seen to true when points are input
    setPlayers(updatedPlayers);
  };

  const handleToggleSeen = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index].seen = !updatedPlayers[index].seen;
    setPlayers(updatedPlayers);
  };

  const handleToggleFoul = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index].foul = !updatedPlayers[index].foul;
    setPlayers(updatedPlayers);
  };

  const handleToggleDublee = (index: number) => {
    const updatedPlayers = [...players];
    updatedPlayers[index].dubleeOpened = !updatedPlayers[index].dubleeOpened;
    setPlayers(updatedPlayers);
  };

  const handleWinnerChange = (selectedId: string) => {
    const updatedRadioButtons = radioButtonsData.map((radioButton) => ({
      ...radioButton,
      selected: radioButton.id === selectedId,
    }));
    setRadioButtonsData(updatedRadioButtons);
    setWinnerIndex(parseInt(selectedId));
  };

  const handleSubmit = async () => {
    if (winnerIndex === null) {
      Alert.alert('Error', 'Please select a winner.');
      return;
    }

    const ruleSet = await AsyncStorage.getItem('ruleSet');
    if (!ruleSet) {
      Alert.alert('Error', 'Please set rules.');
      return;
    }

    const rules = JSON.parse(ruleSet);
    const seenPoints = rules?.seenPoints ?? 0;
    const unseenPoints = rules?.unseenPoints ?? 0;
    const foulPoints = rules?.foulPoints ?? 0;
    const dubleeWinBonusPoints = rules?.dubleeWinBonusPoints ?? 0;

    const noOfPlayers = players.length; // Number of players
    const totalPoints = players.reduce((sum, player) => sum + player.points, 0); // Total points
    let pointsCollected = 0;

    console.log('--------------------------------NEW GAME-----------------------------------------');
    console.log(`handleSubmit: noOfPlayers: ${noOfPlayers}, totalPoints: ${totalPoints}`);

    const playerResults: PlayerResult[] = [];

    let winnerPoints = 0;

    // Calculating points
    players.forEach((player, index) => {
      if (index === winnerIndex) {
        winnerPoints += (noOfPlayers * player.points) - totalPoints;
        playerResults.push({ name: player.name, pointsCollected: winnerPoints });
      } else {
        if (player.foul) {
          // updateFoulHistory(player.name);
          pointsCollected -= foulPoints;
          playerResults.push({ name: player.name, pointsCollected }); // Add player name and pointsCollected to results
          return;
        }

        if (!player.seen) {
          player.points = 0;
        }

        pointsCollected = (noOfPlayers * player.points) - totalPoints;

        if (player.seen) {
          winnerPoints += seenPoints;
          pointsCollected -= seenPoints;
          if (player.dubleeOpened) {
            winnerPoints -= dubleeWinBonusPoints;
            pointsCollected += dubleeWinBonusPoints;
          }
        } else {
          winnerPoints += unseenPoints;
          pointsCollected -= unseenPoints;
        }

        console.log(`handleSubmit: Player: ${player.name}, IsSeen: ${player.seen ? 'true' : 'false'}, pointsCollected: ${pointsCollected}`);

        playerResults.push({ name: player.name, pointsCollected });
      }
    });

    const winnerResult = playerResults.find((result) => result.name === players[winnerIndex].name);
    if (winnerResult) {
      winnerResult.pointsCollected = winnerPoints;
    }

    try {
      const existingHistory = await AsyncStorage.getItem('points_table');
      let history = existingHistory ? JSON.parse(existingHistory) : [];

      history.push(playerResults);

      await AsyncStorage.setItem('points_table', JSON.stringify(history));

      Alert.alert(
        'Calculation Complete'
      );

    } catch (error) {
      console.error('Failed to save points table to AsyncStorage:', error);
      Alert.alert('Error', 'Failed to save calculation data. Please try again.');
    }
  };

  // // Function to update foul history
  // async function updateFoulHistory(playerName: string) {
  //   try {
  //     // Retrieve existing foul history from AsyncStorage
  //     const history = await AsyncStorage.getItem('foulHistory');
  //     const parsedHistory = history ? JSON.parse(history) : {};

  //     // Update the history for the player
  //     if (!parsedHistory[playerName]) {
  //       parsedHistory[playerName] = [];
  //     }
  //     parsedHistory[playerName].push(new Date().toISOString()); // Log the foul with a timestamp

  //     // Save the updated history back to AsyncStorage
  //     await AsyncStorage.setItem('foulHistory', JSON.stringify(parsedHistory));
  //   } catch (error) {
  //     console.error('Failed to update foul history:', error);
  //   }
  // }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      <Text style={styles.title}>Player Points Calculation</Text>
      <View style={styles.headers}>
        <Text style={styles.playersNamelabels}>Players</Text>
        <Text style={styles.labels}>Points</Text>
        <Text style={styles.labels}>Seen</Text>
        <Text style={styles.labels}>Dublee</Text>
        <Text style={styles.labels}>Foul</Text>
      </View>
      {players.map((player, index) => (
        <View key={index} style={styles.playerContainer}>
          <Text style={styles.playerName}>{player.name}</Text>
          <TextInput
            style={styles.input}
            placeholder="Points"
            value={player.points.toString()}
            onChangeText={(text) => handlePointsChange(index, text)}
            keyboardType="numeric"
          />
          <View style={styles.switchContainer}>
            <Switch
              value={player.seen}
              onValueChange={() => handleToggleSeen(index)}
            />
          </View>
          <View style={styles.switchContainer}>
            <Switch
              value={player.dubleeOpened}
              onValueChange={() => handleToggleDublee(index)}
            />
          </View>
          <View style={styles.switchContainer}>
            <Switch
              value={player.foul}
              onValueChange={() => handleToggleFoul(index)}
            />
          </View>
        </View>
      ))}

      <Text style={styles.subtitle}>Select Winner</Text>
      <RadioGroup
        radioButtons={radioButtonsData}
        onPress={handleWinnerChange}
        selectedId={winnerIndex?.toString()}
        containerStyle={styles.radioGroupContainer}
        labelStyle={styles.radioLabel}
      />
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>Calculate</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      padding: 20,
      color: isDarkMode ? 'white' : 'black',
      flexDirection: "column"
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: isDarkMode ? 'white' : 'black',
    },
    subtitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 16,
      color: isDarkMode ? 'white' : 'black',
    },
    radioGroupContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap'
    },
    radioLabel: {
      fontSize: 16,
      color: isDarkMode ? 'white' : 'black',
    },
    headers: {
      marginBottom: 20,
      color: isDarkMode ? 'white' : 'black',
      flexDirection: "row"
    },
    playerContainer: {
      marginBottom: 20,
      color: isDarkMode ? 'white' : 'black',
      flexDirection: "row"
    },
    playerName: {
      fontSize: 18,
      marginBottom: 10,
      color: isDarkMode ? 'white' : 'black',
      width: 100
    },
    playersNamelabels: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDarkMode ? 'white' : 'black',
      width: 100
    },
    labels: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
      color: isDarkMode ? 'white' : 'black',
      width: 70
    },
    input: {
      height: 30,
      width: 60,
      borderColor: '#ccc',
      borderWidth: 1,
      paddingLeft: 8,
      marginRight: 10,
      marginBottom: 10,
      color: isDarkMode ? 'white' : 'black',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      color: isDarkMode ? 'white' : 'black',
      width: 60,
      marginRight: 10,
    },
    button: {
      backgroundColor: '#007bff',
      padding: 12,
      borderRadius: 5,
      alignItems: 'center',
      marginTop: 16,
      color: isDarkMode ? 'white' : 'black',
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    }
  });
