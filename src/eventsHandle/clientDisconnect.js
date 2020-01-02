import service from '../service'
const {
  updateRelatedRoomInfo,
  updateRelatedGameInfo
} = service

export default function clientDisconnectHandle(socket, io, gameData, roomData, onlineUsers, baseInfo, updateAllHomeInfo) {
  console.log('disconnect!')
  let clientId = socket.id
  let leftPlayer = onlineUsers[clientId]
  // console.log(leftPlayer)
  if (leftPlayer) {
    let roomId = leftPlayer.currentRoom
    // console.log(roomId)
    if (roomId) {
      let room = roomData[roomId]
      if (room && room.status === 1) { // 在游戏中则更新游戏信息
        updateRelatedGameInfo(gameData, roomData, roomId, leftPlayer, io, updateAllHomeInfo)
      }
      updateRelatedRoomInfo(roomData, roomId, leftPlayer)
    }
  }

  delete onlineUsers[clientId]
  // console.log(onlineUsers)
  baseInfo.onlineCount--

  updateAllHomeInfo()
}