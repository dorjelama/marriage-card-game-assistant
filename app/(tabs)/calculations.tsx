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
  isWinner: boolean;
  isFouler: boolean;
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

    // Retrieve the last game's fouler from AsyncStorage
    let lastGameFouler: string | null = null;
    let foulerHistoryNeedsCleaning = false;

    try {
      const foulerData = await AsyncStorage.getItem('last_fouler');
      lastGameFouler = foulerData !== null ? JSON.parse(foulerData) : null; // Ensure null is handled properly

      if (lastGameFouler) {
        console.log("Last Game had fouler: " + lastGameFouler);
        foulerHistoryNeedsCleaning = true;
      }
    } catch (error) {
      console.error('Failed to retrieve last game fouler:', error);
    }

    console.log('--------------------------------NEW GAME-----------------------------------------');
    console.log(`handleSubmit: noOfPlayers: ${noOfPlayers}, totalPoints: ${totalPoints}`);

    const playerResults: PlayerResult[] = [];

    let pointsCollected = 0;
    let winnerPoints = 0;

    // Calculating points
    for (const [index, player] of players.entries()) {
      if (index === winnerIndex) {
        winnerPoints += (noOfPlayers * player.points) - totalPoints;
        if (player.dubleeOpened) {
          winnerPoints += dubleeWinBonusPoints;
        }

        // Check if there's a last game's fouler, add the foul points to the winner
        if (lastGameFouler) {
          if (player.name !== lastGameFouler) {
            winnerPoints += foulPoints;
          }
        }

        playerResults.push({ name: player.name, pointsCollected: winnerPoints, isFouler: false, isWinner: true });
      } else {

        if (player.foul) {
          player.points = 0;
          try {
            // Log the player's name before saving to AsyncStorage
            console.log(`Setting fouler in AsyncStorage: ${player.name}`);

            // Save the fouler's name to AsyncStorage
            await AsyncStorage.setItem('last_fouler', JSON.stringify(player.name));

            // Retrieve and log the stored fouler to confirm it's correctly saved
            const storedFouler = await AsyncStorage.getItem('last_fouler');
            console.log('Fouler set in AsyncStorage:', storedFouler ? JSON.parse(storedFouler) : 'None');

          } catch (error) {
            console.error('Failed to store fouler:', error);
          }
        }

        if (!player.seen) {
          player.points = 0;
        }

        pointsCollected = (noOfPlayers * player.points) - totalPoints;

        if (foulerHistoryNeedsCleaning) {
          // Check if there's a last game's fouler, add the foul points to the winner
          if (player.name === lastGameFouler) {
            console.log(`Last Game Fouler: ${player.name}`);
            console.log(`Foul Points: ${foulPoints}`);
            pointsCollected -= foulPoints;
          }
        }

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

        playerResults.push({ name: player.name, pointsCollected, isFouler: false, isWinner: false });
      }
    }

    if (foulerHistoryNeedsCleaning) {
      try {
        await AsyncStorage.removeItem('last_fouler');
      } catch (error) {
        console.error('Failed to remove last game fouler:', error);
      }
    }

    const winnerResult = playerResults.find((result) => result.name === players[winnerIndex].name);
    if (winnerResult) {
      winnerResult.pointsCollected = winnerPoints;
    }
    console.log(`handleSubmit: winnerPoints: ${winnerPoints}`);

    try {
      const existingHistory = await AsyncStorage.getItem('points_table');
      let history = existingHistory ? JSON.parse(existingHistory) : [];

      history.push(playerResults);

      await AsyncStorage.setItem('points_table', JSON.stringify(history));

      Alert.alert('Calculation Complete');

    } catch (error) {
      console.error('Failed to save points table to AsyncStorage:', error);
      Alert.alert('Error', 'Failed to save calculation data. Please try again.');
    }
  };

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
