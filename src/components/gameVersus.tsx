"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useSocket } from "~/hooks/useSocket";
import type {
  BoardCell,
  GameRoom,
  Winner,
  Message,
  GameActionData,
  JoinRoomRequest,
  JoinRoomRequestData,
} from "~/types";
import type { Session } from "next-auth";
import { JOIN_ROOM_REQUEST_TIMEOUT_DURATION_MS } from "~/constants";
import { getTimestamp } from "~/lib/utils";
import { useGameInPlay } from "~/contexts/gameInPlayContext";
import GameInProgress from "./gameInProgress";
import type { OpponentGameRef } from "./opponentGame";
import ChatWindow from "./chatWindow";
import JoinRoomRequestDialog from "./joinRoomRequestDialog";
import WaitingForReady from "./waitingForReady";
import CurrentRoomInfo from "./currentRoomInfo";
import RoomLobby from "./roomLobby";

export default function GameVersus({ session }: { session: Session }) {
  const { setIsGameInPlay } = useGameInPlay();
  const { socket, isConnected } = useSocket();
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [gamePaused, setGamePaused] = useState(false); // in versus mode, pause state must be synced
  const [isGameOver, setIsGameOver] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [winner, setWinner] = useState<Winner>(null);
  const [outgoingJoinRequest, setOutgoingJoinRequest] =
    useState<JoinRoomRequest>(null);
  const [incomingJoinRequest, setIncomingJoinRequest] =
    useState<JoinRoomRequest>(null);
  const [incomingJoinRequestData, setIncomingJoinRequestData] =
    useState<JoinRoomRequestData | null>(null);
  const opponentGameRef = useRef<OpponentGameRef>(null);
  const hostGameReceiveGarbageRef = useRef<
    ((garbageLines: BoardCell[][]) => void) | null
  >(null);
  const joinRoomRequestTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const bothPlayersReady =
    currentRoom?.players.length === 2 &&
    currentRoom?.players?.every((player) => player.ready);
  const currentPlayer = currentRoom?.players.find(
    (p) => p.userId === session?.user?.id,
  );
  const opponentPlayer = useMemo(
    () => currentRoom?.players.find((p) => p.userId !== session?.user?.id),
    [currentRoom, session?.user?.id],
  );
  const isRoomHost = useMemo(() => {
    return currentRoom?.players[0]?.userId === session.user.id;
  }, [currentRoom, session.user.id]);

  const addMessage = useCallback(
    (message: Message) => {
      if (!socket || !session?.user?.id || !currentRoom) return;

      socket.emit("send-message", {
        roomId: currentRoom.id,
        message: message.content,
        username: message.username,
        timestamp: message.timestamp,
      });
    },
    [socket, session?.user?.id, currentRoom],
  );

  function createRoom() {
    if (!socket || !session?.user?.id || !session?.user?.name) return;
    socket.emit("create-room", session.user.id, session.user.name);
  }

  function joinRoomRequest(roomId: string) {
    if (!socket || !session?.user?.id || !session?.user?.name) return;
    setOutgoingJoinRequest("pending");
    socket.emit("join-room-request", {
      roomId,
      userId: session.user.id,
      username: session.user.name,
    });
  }

  function leaveRoom(roomId: string) {
    if (!socket || !session?.user?.id || !session?.user?.name) return;
    setCurrentRoom(null);
    setOutgoingJoinRequest(null);
    setIncomingJoinRequest(null);
    setIncomingJoinRequestData(null);
    socket.emit("leave-room", {
      roomId,
      userId: session.user.id,
      username: session.user.name,
    });
  }

  function toggleReady() {
    if (!socket || !currentRoom || !session?.user?.id) return;

    socket.emit("toggle-ready", {
      roomId: currentRoom.id,
      userId: session.user.id,
    });
  }

  function declineIncomingJoinRequest({ message }: { message?: string }) {
    if (
      !socket ||
      !session?.user?.id ||
      !incomingJoinRequestData?.userId ||
      !currentRoom?.id
    ) {
      return;
    }
    if (joinRoomRequestTimeoutIdRef.current) {
      clearTimeout(joinRoomRequestTimeoutIdRef.current);
      joinRoomRequestTimeoutIdRef.current = null;
    }
    socket.emit("decline-join-request", {
      roomId: currentRoom.id,
      userId: incomingJoinRequestData.userId, // the user who is being rejected
      message,
    });
    setIncomingJoinRequest("rejected");
    setIncomingJoinRequestData(null);
  }

  function acceptIncomingJoinRequest() {
    if (
      !socket ||
      !session?.user?.id ||
      !incomingJoinRequestData?.userId ||
      !currentRoom?.id
    ) {
      return;
    }
    if (joinRoomRequestTimeoutIdRef.current) {
      clearTimeout(joinRoomRequestTimeoutIdRef.current);
      joinRoomRequestTimeoutIdRef.current = null;
    }
    socket.emit("accept-join-room-request", {
      roomId: currentRoom.id,
      userId: incomingJoinRequestData.userId,
      username: incomingJoinRequestData.username,
    });
    setIncomingJoinRequest("accepted");
  }

  const handleMessageSent = useCallback(
    (data: {
      roomId: string;
      message: string;
      username: string;
      timestamp: number;
    }) => {
      setMessages((prev) => [
        ...prev,
        {
          timestamp: data.timestamp,
          content: data.message,
          username: data.username,
        },
      ]);

      const showToast =
        !isChatOpen &&
        data.username !== "System" &&
        data.username !== session.user.name;
      if (!showToast) return;
      toast.info(`${data.username} sent a message`, {
        action: {
          label: "Open Chat",
          onClick: () => setIsChatOpen(true),
        },
      });
    },
    [isChatOpen, session?.user?.name],
  );

  // socket logic
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    socket.on("rooms-list", (rooms: GameRoom[]) => setAvailableRooms(rooms));
    socket.on("rooms-updated", (rooms: GameRoom[]) => setAvailableRooms(rooms));
    socket.on("room-created", (data) => setCurrentRoom(data.room));
    socket.on("player-joined", (data) => {
      setCurrentRoom(data.room);
      const isHost = data.room.players[0]?.userId === session?.user?.id;
      const hostUsername = data.room.players[0]?.username;
      const toastMessage = isHost
        ? `${data.username} joined your room`
        : `You joined ${hostUsername}'s room`;
      toast.success(toastMessage);
      setOutgoingJoinRequest("accepted");
    });
    // this is an incoming join request
    socket.on("join-room-request", (data) => {
      if (joinRoomRequestTimeoutIdRef.current) {
        clearTimeout(joinRoomRequestTimeoutIdRef.current);
        joinRoomRequestTimeoutIdRef.current = null;
      }
      setIncomingJoinRequest("pending");
      setIncomingJoinRequestData({
        room: data.room.id,
        userId: data.userId,
        username: data.username,
      });
      joinRoomRequestTimeoutIdRef.current = setTimeout(() => {
        setIncomingJoinRequest("rejected");
        toast.error("Join request timed out");
        if (socket && data.userId && data.room.id) {
          socket.emit("decline-join-request", {
            roomId: data.room.id,
            userId: data.userId,
            message: "Join request timed out",
          });
        }
        joinRoomRequestTimeoutIdRef.current = null;
      }, JOIN_ROOM_REQUEST_TIMEOUT_DURATION_MS);
    });
    socket.on("request-declined", (data) => {
      toast.error(data.message ?? "Join request rejected");
      setOutgoingJoinRequest("rejected");
    });
    socket.on("player-ready-changed", (data) => {
      setCurrentRoom(data.room);
      if (
        data.room.players.length === 2 &&
        data.room.players.every((p) => p.ready)
      ) {
        setIsGameInPlay(true);
      }
    });
    socket.on("error", (data) => {
      addMessage({
        timestamp: getTimestamp(),
        content: `Error: ${data.message}`,
        username: "System",
      });
      toast.error(data.message);
    });
    socket.on("player-disconnected", (data) => {
      addMessage({
        timestamp: getTimestamp(),
        content: `${data.username} disconnected from room`,
        username: "System",
      });
      toast.info(`${data.username} disconnected from room`);

      const { room, roomId, userId } = data;
      if (room) setCurrentRoom(room);
      if (isGameOver) return;
      socket.emit("game-over-event", {
        roomId,
        action: {
          type: "game-over",
          playerId: userId,
          timestamp: getTimestamp(),
        },
      });
    });
    socket.on("opponent-action", (data: GameActionData) => {
      if (data.action.type === "send-garbage") {
        // 'send-garbage' is the one event that needs to be handled by the host game, as it affects the host game's state
        hostGameReceiveGarbageRef.current?.(data?.action?.garbageLines);
      } else {
        opponentGameRef.current?.triggerAction(data.action);
      }
    });
    socket.on("game-pause-event", (data: GameActionData) => {
      setGamePaused(data.action.type === "game-pause" ? true : false);
    });
    socket.on("game-over-event", (data: GameActionData) => {
      if (isGameOver) return;
      setIsGameOver(true);
      setIsGameInPlay(false);
      if (data.action.type !== "game-over") return;
      // there is a potential for error here, as the winner is set based on whoever sends the gameover event first
      // so in a case where player 1's game ended first, they send a game over event. Meanwhile player 2's game also ended
      // and they send the game over event second. The should win the game, but if the event they sent arrives before player 1's,
      // due to network speed, then the incorrect player will be set as the winner.
      // this is pretty unlikely, but good to note.
      setWinner(
        data.action.playerId === session?.user?.id ? "opponent" : "you",
      );
    });
    socket.on("message-sent", (data) => handleMessageSent(data));

    // Cleanup listeners
    return () => {
      socket.off("rooms-list");
      socket.off("rooms-updated");
      socket.off("room-created");
      socket.off("player-joined");
      socket.off("join-room-request");
      socket.off("request-declined");
      socket.off("player-ready-changed");
      socket.off("error");
      socket.off("player-disconnected");
      socket.off("opponent-action");
      socket.off("game-pause-event");
      socket.off("game-over-event");
      socket.off("message-sent");

      if (joinRoomRequestTimeoutIdRef.current) {
        clearTimeout(joinRoomRequestTimeoutIdRef.current);
        joinRoomRequestTimeoutIdRef.current = null;
      }
    };
  }, [socket, session?.user?.id, isGameOver, addMessage, handleMessageSent]);

  if (!socket) return null;

  return (
    <div>
      {bothPlayersReady && currentRoom && opponentPlayer?.username ? (
        <GameInProgress
          isRoomHost={isRoomHost}
          isGameOver={isGameOver}
          winner={winner}
          opponentPlayer={opponentPlayer}
          currentRoom={currentRoom}
          socket={socket}
          session={session}
          gamePaused={gamePaused}
          opponentGameRef={opponentGameRef}
          hostGameReceiveGarbageRef={hostGameReceiveGarbageRef}
        />
      ) : currentRoom?.players.length === 2 ? (
        <div className="mx-auto max-w-2xl">
          <WaitingForReady
            isCurrentPlayerReady={!!currentPlayer?.ready}
            onToggleReady={toggleReady}
          />
          <CurrentRoomInfo currentRoom={currentRoom} onLeaveRoom={leaveRoom} />
        </div>
      ) : (
        <RoomLobby
          waitingForJoinRoomResponse={outgoingJoinRequest === "pending"}
          currentRoom={currentRoom}
          availableRooms={availableRooms}
          isConnected={isConnected}
          session={session}
          onCreateRoom={createRoom}
          onJoinRoomRequest={joinRoomRequest}
          onLeaveRoom={leaveRoom}
        />
      )}

      {currentRoom && (
        <ChatWindow
          isOpen={isChatOpen}
          onOpenChange={setIsChatOpen}
          messages={messages}
          session={session}
          addMessage={addMessage}
        />
      )}
      {incomingJoinRequestData && (
        <JoinRoomRequestDialog
          open={incomingJoinRequest === "pending"}
          username={incomingJoinRequestData.username}
          onDecline={declineIncomingJoinRequest}
          onAccept={acceptIncomingJoinRequest}
        />
      )}
    </div>
  );
}
