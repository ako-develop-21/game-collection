import { ref } from "vue";
import { db } from "../lib/firebase";
import {
  ref as dbRef,
  onValue,
  set,
  onDisconnect,
  get,
} from "firebase/database";

export interface RemotePlayer {
  id: number;
  name: string;
  color: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: number;
}

export function useCatanRoom() {
  const roomId = ref<string | null>(null);
  const roomPlayers = ref<RemotePlayer[]>([]);
  const isHost = ref(false);
  const myPlayerIdInRoom = ref<number | null>(null);
  const gameStartedInRoom = ref(false);
  const aiCountInRoom = ref(0);

  const createRoom = async (playerName: string) => {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase();
    roomId.value = id;

    const initialPlayer: RemotePlayer = {
      id: 0,
      name: playerName,
      color: "#e74c3c",
      isHost: true,
      isReady: true,
      joinedAt: Date.now(),
    };

    await set(dbRef(db, `catan/rooms/${id}/players/0`), initialPlayer);
    await set(dbRef(db, `catan/rooms/${id}/gameStarted`), false);
    await set(dbRef(db, `catan/rooms/${id}/aiCount`), 0);
    isHost.value = true;
    myPlayerIdInRoom.value = 0;
    listenToRoom(id);

    // Cleanup on disconnect
    onDisconnect(dbRef(db, `catan/rooms/${id}/players/0`)).remove();

    return id;
  };

  const joinRoom = async (id: string, playerName: string) => {
    const playersRef = dbRef(db, `catan/rooms/${id}/players`);
    const snapshot = await get(playersRef);
    const existingPlayers = snapshot.val() || {};
    const playerIndices = Object.keys(existingPlayers).map(Number);

    if (playerIndices.length >= 4) {
      throw new Error("Room is full");
    }

    const nextIndex =
      playerIndices.length > 0 ? Math.max(...playerIndices) + 1 : 0;

    const newPlayer: RemotePlayer = {
      id: nextIndex,
      name: playerName,
      color: ["#3498db", "#2ecc71", "#f1c40f"][nextIndex - 1] || "#9b59b6",
      isHost: false,
      isReady: true,
      joinedAt: Date.now(),
    };

    await set(dbRef(db, `catan/rooms/${id}/players/${nextIndex}`), newPlayer);
    roomId.value = id;
    myPlayerIdInRoom.value = nextIndex;
    isHost.value = false;
    listenToRoom(id);

    // Cleanup on disconnect
    onDisconnect(dbRef(db, `catan/rooms/${id}/players/${nextIndex}`)).remove();

    return id;
  };

  const listenToRoom = (id: string) => {
    const playersRef = dbRef(db, `catan/rooms/${id}/players`);
    onValue(playersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        roomPlayers.value = Object.values(data);
      }
    });

    const gameStartedRef = dbRef(db, `catan/rooms/${id}/gameStarted`);
    onValue(gameStartedRef, (snapshot) => {
      gameStartedInRoom.value = !!snapshot.val();
    });

    const aiCountRef = dbRef(db, `catan/rooms/${id}/aiCount`);
    onValue(aiCountRef, (snapshot) => {
      aiCountInRoom.value = snapshot.val() || 0;
    });
  };

  const addAI = async () => {
    if (
      roomId.value &&
      isHost.value &&
      roomPlayers.value.length + aiCountInRoom.value < 4
    ) {
      await set(
        dbRef(db, `catan/rooms/${roomId.value}/aiCount`),
        aiCountInRoom.value + 1,
      );
    }
  };

  const removeAI = async () => {
    if (roomId.value && isHost.value && aiCountInRoom.value > 0) {
      await set(
        dbRef(db, `catan/rooms/${roomId.value}/aiCount`),
        aiCountInRoom.value - 1,
      );
    }
  };

  const startGameInRoom = async () => {
    if (roomId.value && isHost.value) {
      await set(dbRef(db, `catan/rooms/${roomId.value}/gameStarted`), true);
    }
  };

  const leaveRoom = async () => {
    if (roomId.value && myPlayerIdInRoom.value !== null) {
      await set(
        dbRef(
          db,
          `catan/rooms/${roomId.value}/players/${myPlayerIdInRoom.value}`,
        ),
        null,
      );
      roomId.value = null;
      roomPlayers.value = [];
      myPlayerIdInRoom.value = null;
      isHost.value = false;
    }
  };

  return {
    roomId,
    roomPlayers,
    isHost,
    myPlayerIdInRoom,
    gameStartedInRoom,
    aiCountInRoom,
    createRoom,
    joinRoom,
    leaveRoom,
    startGameInRoom,
    addAI,
    removeAI,
  };
}
