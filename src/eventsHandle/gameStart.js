import { getNextKey } from '../data'
import service from '../service'

const {
  updateGameData,
  timeCountDown
} = service

export default function gameStartHandle(data, roomData, gameData, socket, io, updateAllHomeInfo) {
  // console.log(data)
  const { socketRoom, id, players } = data
  if (players.length < 2 || roomData[id].status !== 0) {
    console.log('无法开始游戏')
    return
  }

  let gameKey = getNextKey()

  roomData[id].status = 1
  gameData[id] = {
    id,
    socketRoom,
    totalTimes: players.length * 2 + 1,
    playTimes: 0,
    players: players.map(p => ({
      ...p,
      isPainter: p.clientId === socket.id,
      score: 0
    })),
    userScore: {},
    playInfo: {
      key: gameKey,
      painter: players[0],
      gameTime: 60
    }
  }
  let currentGame = gameData[id]
  updateGameData(currentGame, io)

  timeCountDown(currentGame, roomData, io, updateAllHomeInfo)

  updateAllHomeInfo()
}