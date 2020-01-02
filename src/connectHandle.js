import loginHandle from './eventsHandle/login'
import userCreateHandle from './eventsHandle/userCreate'
import userUpdateHandle from './eventsHandle/userUpdate'
import roomCreateHandle from './eventsHandle/roomCreate'
import roomSearchHandle from './eventsHandle/roomSearch'
import roomEnterHandle from './eventsHandle/roomEnter'
import roomLeftHandle from './eventsHandle/roomLeft'
import roomChatHandle from './eventsHandle/roomChat'
import gameStartHandle from './eventsHandle/gameStart'
import gameReceiveActionHandle from './eventsHandle/gameReceiveAction'
import gameReceiveImageHandle from './eventsHandle/gameReceiveImage'
import gameReceiveAnswerHandle from './eventsHandle/gameReceiveAnswer'
import clientDisconnectHandle from './eventsHandle/clientDisconnect'

const connectHandle = (socket, baseInfo, io, count) => {
  console.log('user comes in', socket.id)
  // console.log(socket.rooms)

  let clientId = socket.id
  let {
    onlineUsers,
    roomData,
    gameData
  } = baseInfo

  const getHomeInfo = () => ({
    roomData: Object.keys(roomData).map(key => ({ ...roomData[key], id: key })),
    onlineCount: baseInfo.onlineCount
  })

  const updateAllHomeInfo = () => {
    io.emit('homeInfo', getHomeInfo())
  }

  const updateHomeInfo = () => {
    socket.emit('homeInfo', getHomeInfo())
  }

  baseInfo.onlineCount++
  console.log(baseInfo.onlineCount)

  updateAllHomeInfo()

  socket.on('login', (data) => {
    loginHandle(data, socket, onlineUsers)
  })

  socket.on('updateHome', () => {
    updateHomeInfo()
  })

  socket.on('createUser', data => {
    userCreateHandle(data, socket, onlineUsers)
  })

  socket.on('updateUserName', data => {
    userUpdateHandle(data, socket, onlineUsers)
  })

  socket.on('searchRoom', data => {
    roomSearchHandle(data, socket, roomData, onlineUsers, updateAllHomeInfo)
  })

  socket.on('createRoom', data => {
    roomCreateHandle(data, socket, io, roomData, onlineUsers, count, getHomeInfo)
  })

  socket.on('enterRoom', data => {
    roomEnterHandle(data, socket, roomData, onlineUsers, updateAllHomeInfo)
  })

  socket.on('leftRoom', data => {
    roomLeftHandle(data, socket, roomData, onlineUsers, updateAllHomeInfo)
  })

  socket.on('chatMessage', data => {
    roomChatHandle(data, socket, io)
  })

  socket.on('startGame', data => {
    gameStartHandle(data, roomData, gameData, socket, io, updateAllHomeInfo)
  })

  socket.on('drawAction', data => {
    gameReceiveActionHandle(data, socket)
  })

  socket.on('imageData', data => {
    gameReceiveImageHandle(data, socket)
  })

  socket.on('answer', data => {
    gameReceiveAnswerHandle(data, roomData, gameData, io, updateAllHomeInfo)
  })

  socket.on('disconnect', data => {
    // console.log(data)
    clientDisconnectHandle(socket, io, gameData, roomData, onlineUsers, baseInfo, updateAllHomeInfo)
  })
}

export default connectHandle