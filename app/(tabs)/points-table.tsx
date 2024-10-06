import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, useColorScheme, ActivityIndicator, Button, Alert, RefreshControl, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Define PlayerResult type
type PlayerResult = {
  name: string;
  pointsCollected: number;
};

// PointsTable component
const PointsTable: React.FC = () => {
  const [games, setGames] = useState<PlayerResult[][] | null>(null); // State to store multiple games with players
  const [loading, setLoading] = useState<boolean>(true); // State to manage loading
  const [refreshing, setRefreshing] = useState<boolean>(false); // State to manage pull-to-refresh
  const colorScheme = useColorScheme(); // Detect system's color scheme (light or dark)
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);
  const [pointRate, setPointRate] = useState(0);

  // Fetch games from AsyncStorage
  const fetchGames = async () => {
    try {
      const pointsData = await AsyncStorage.getItem('points_table');
      console.log('Fetched data:', pointsData); // Log fetched data
      if (pointsData) {
        const parsedData: PlayerResult[][] = JSON.parse(pointsData);
        console.log('Parsed data:', parsedData); // Log parsed data
        if (Array.isArray(parsedData)) {
          setGames(parsedData); // Set state with parsed games data
        } else {
          console.error("Invalid data structure: Expected an array of arrays of players.");
          setGames(null); // Safeguard in case the structure is invalid
        }
      } else {
        setGames(null); // Handle case if no data is present
      }
    } catch (error) {
      console.error('Error retrieving points table:', error);
    } finally {
      setLoading(false); // Set loading to false once data is fetched
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  // Clear history (remove points_table from AsyncStorage)
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('points_table');
      setGames(null); // Clear the state
      Alert.alert("History cleared", "The points table has been cleared.");
    } catch (error) {
      console.error('Error clearing history:', error);
      Alert.alert("Error", "Unable to clear history.");
    }
  };

  const getPointRate = async (): Promise<number> => {
    try {
      const ruleSet = await AsyncStorage.getItem('ruleSet');
      if (!ruleSet) {
        console.error('Error', 'No Rules Set.');
        return 0;
      }

      const rules = JSON.parse(ruleSet);
      return rules?.pointRate ?? 0;

    } catch (error) {
      console.error('Error getting rule:', error);
      return 0;
    }
  };
  useEffect(() => {
    const fetchPointRate = async () => {
      const rate = await getPointRate();
      setPointRate(rate);
    };
    fetchPointRate();
  }, []);

  const playerNamesFromFirstGame = (games?.[0] || []).map(player => player.name);

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGames(); // Re-fetch the games
    setRefreshing(false); // Stop the refreshing indicator
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={isDarkMode ? 'white' : 'black'} />
      </View>
    );
  }

  if (!games || games.length === 0) {
    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.container}>
          <Button title="Clear History" onPress={clearHistory} />
          <Text style={styles.title}>No data available</Text>
        </View>
      </ScrollView>
    );
  }

  const removePointsData = (gameIndex: number) => {
    const updatedGames = games.filter((_, index) => index !== gameIndex);
    setGames(updatedGames);
    AsyncStorage.setItem('points_table', JSON.stringify(updatedGames));
    Alert.alert("Game removed", "The game has been removed from the points table.");
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ flex: 1, justifyContent: 'flex-start' }}>
          <Button title="Clear History" onPress={clearHistory} />
          <Text style={styles.title}>Points Table</Text>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.headerText]}>Game</Text>
            {playerNamesFromFirstGame.map((name, index) => (
              <Text key={index} style={[styles.cell, styles.headerText]}>{name}</Text>
            ))}
            <Text style={[styles.actionCell, styles.headerText]}></Text>
          </View>

          {games.map((game, gameIndex) => (
            <View key={gameIndex} style={styles.row}>
              <Text style={styles.cell}>{gameIndex + 1}</Text>

              {game.map((player, playerIndex) => (
                <Text key={playerIndex} style={styles.cell}>
                  {player.pointsCollected}
                </Text>
              ))}

              <TouchableOpacity style={styles.actionCell} onPress={() => removePointsData(gameIndex)}>
                <Icon name="remove-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}

        </View>
      </ScrollView>

      <View style={{ marginBottom: 20 }}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerText]}>Points</Text>
          {playerNamesFromFirstGame.map((name, index) => {
            const totalPoints = games.reduce((acc, curr) => acc + curr[index].pointsCollected, 0)
            return <Text key={index} style={[styles.cell, styles.headerText]}>{totalPoints}</Text>
          })}
          <Text style={[styles.actionCell, styles.headerText]}></Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerText]}> $$$ </Text>
          {playerNamesFromFirstGame.map((name, index) => {
            const totalPoints = games.reduce((acc, curr) => acc + curr[index].pointsCollected, 0)
            const multipliedPoints = totalPoints * pointRate;
            return <Text key={index} style={[styles.cell, styles.headerText]}>{multipliedPoints}</Text>
          })}
          <Text style={[styles.actionCell, styles.headerText]}></Text>
        </View>
      </View>
    </View>
  );
};

// Styles function
const getStyles = (isDarkMode: boolean) =>
  StyleSheet.create({
    container: {
      padding: 16,
      flexDirection: 'column',
    },
    headerRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: '#000',
      paddingBottom: 8,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
    },
    cell: {
      flex: 1,
      fontSize: 16,
      textAlign: 'center',
      padding: 8,
      color: isDarkMode ? 'white' : 'black',
    },
    actionCell: {
      flex: 1,
      padding: 8,
      paddingRight: 0,
      color: isDarkMode ? 'white' : 'black',
    },
    headerText: {
      fontWeight: 'bold',
      fontSize: 16,
      color: isDarkMode ? 'white' : 'black',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
      color: isDarkMode ? 'white' : 'black',
    },
  });

export default PointsTable;
