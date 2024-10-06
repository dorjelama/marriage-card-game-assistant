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
  const [games, setGames] = useState<PlayerResult[][] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const styles = getStyles(isDarkMode);
  const [pointRate, setPointRate] = useState(0);

  useEffect(() => {
    fetchGames();
  }, []);

  // Fetch games from AsyncStorage
  const fetchGames = async () => {
    try {
      const pointsData = await AsyncStorage.getItem('points_table');
      if (pointsData) {
        const parsedData: PlayerResult[][] = JSON.parse(pointsData);
        if (Array.isArray(parsedData)) {
          setGames(parsedData);
        } else {
          setGames(null); // Handle invalid data structure
        }
      } else {
        setGames(null); // Handle no data
      }
    } catch (error) {
      console.error('Error retrieving points table:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear history (remove points_table from AsyncStorage)
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('points_table');
      setGames(null); // Clear the state
      Alert.alert("History cleared", "The points table has been cleared.");
      fetchGames(); // Re-fetch games to ensure state consistency
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

  // Utility function to extract unique player names
  const getAllUniquePlayerNames = (games: PlayerResult[][]): string[] => {
    const allPlayerNames = games.flatMap(game => game.map(player => player.name));
    return Array.from(new Set(allPlayerNames)); // Ensure uniqueness
  };

  const playerNamesFromFirstGame = (games?.[0] || []).map(player => player.name);

  const allUniquePlayerNames = games ? getAllUniquePlayerNames(games) : [];

  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGames();
    setRefreshing(false);
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
    Alert.alert(
      'Remove Game',
      'Are you sure you want to remove this game?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            const updatedGames = games.filter((_, index) => index !== gameIndex);
            setGames(updatedGames);
            await AsyncStorage.setItem('points_table', JSON.stringify(updatedGames));
            Alert.alert("Game removed", "The game has been removed from the points table.");
          },
        },
      ],
      { cancelable: true }
    );
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

          {/* Header Row with Unique Player Names */}
          <View style={styles.row}>
            <Text style={[styles.cell, styles.headerText]}>Game</Text>
            {allUniquePlayerNames.map((name, index) => (
              <Text key={index} style={[styles.cell, styles.headerText]}>{name}</Text>
            ))}

            <Text style={[styles.actionCell, styles.headerText]}></Text>
          </View>

          {/* Game Data Rows */}
          {games.map((game, gameIndex) => (
            <View key={gameIndex} style={styles.row}>
              <Text style={styles.cell}>{gameIndex + 1}</Text>

              {allUniquePlayerNames.map((playerName, playerIndex) => {
                const player = game.find(p => p.name === playerName);
                return (
                  <Text key={playerIndex} style={styles.cell}>
                    {player ? player.pointsCollected : 0} {/* Show 0 if player is not in this game */}
                  </Text>
                );
              })}

              <TouchableOpacity style={styles.actionCell} onPress={() => removePointsData(gameIndex)}>
                <Icon name="remove-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Totals Section */}
      <View style={{ marginBottom: 20 }}>
        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerText]}>Points</Text>
          {allUniquePlayerNames.map((name, index) => {
            const totalPoints = games.reduce((acc, curr) => {
              const player = curr.find(p => p.name === name);
              return acc + (player ? player.pointsCollected : 0);
            }, 0);
            return <Text key={index} style={[styles.cell, styles.headerText]}>{totalPoints}</Text>;
          })}
          <Text style={[styles.actionCell, styles.headerText]}></Text>
        </View>

        <View style={styles.row}>
          <Text style={[styles.cell, styles.headerText]}> $$$ </Text>
          {allUniquePlayerNames.map((name, index) => {
            const totalPoints = games.reduce((acc, curr) => {
              const player = curr.find(p => p.name === name);
              return acc + (player ? player.pointsCollected : 0);
            }, 0);
            const multipliedPoints = totalPoints * pointRate;
            return <Text key={index} style={[styles.cell, styles.headerText]}>{multipliedPoints}</Text>;
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
      flex: 2,
      fontSize: 16,
      textAlign: 'center',
      padding: 8,
      color: isDarkMode ? 'white' : 'black',
    },
    actionCell: {
      flex: 1,
      paddingTop: 8,
      paddingBottom: 8,
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
