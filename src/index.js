import path from 'path'
import http from 'http'
import Koa from 'koa'
import socketIo from 'socket.io'
import uuid from 'uuid/v4'
import { getNextKey } from './data'

const PORT = 9000
const app = new Koa()
const server = http.createServer(app.callback())
const io = socketIo(server)

let generateRoomId = () => {
  let d = new Date()
  return parseInt('' + d.getDate() + d.getHours() + d.getMinutes() + d.getSeconds())
}
// socket 房间id
let count = 0

// 在线玩家
let onlineUsers = {}
// 在线人数
let onlineCount = 0

let roomData = {
  // '24017': {
  //   id: '24017',
  //   playersCount: 3,
  //   type: 0,
  //   status: 0,
  //   master: {
  //     uid: '2134',
  //     username: '我嘞个去'
  //   }
  // },
  // '24077': {
  //   id: '24077',
  //   playersCount: 4,
  //   type: 0,
  //   status: 1,
  //   master: {
  //     uid: '2234',
  //     username: '哈哈哈哈'
  //   }
  // }
}

let gameData = {}

let baseInfo = {
  onlineUsers,
  roomData,
  gameData
}

let handleConnect = (socket, baseInfo) => {
  console.log('user comes in', socket.id)
  console.log(socket.rooms)

  let clientId = socket.id
  let {
    onlineUsers,
    roomData,
    gameData
  } = baseInfo

  const getHomeInfo = () => ({
    roomData: Object.keys(roomData).map(key => ({ ...roomData[key], id: key })),
    onlineCount
  })

  const updateAllHomeInfo = () => {
    io.emit('homeInfo', getHomeInfo())
  }

  const updateHomeInfo = () => {
    socket.emit('homeInfo', getHomeInfo())
  }

  onlineCount++
  console.log(onlineCount)

  updateAllHomeInfo()

  socket.on('login', data => {
    console.log(data)

    onlineUsers[clientId] = {
      ...data,
      clientId
    }
  })

  socket.on('updateHome', () => {
    updateHomeInfo()
  })

  socket.on('createUser', (data) => {
    console.log(data)
    let uid = uuid()
    onlineUsers[uid] = {
      username: data.name,
      uid
    }
    // onlineCount ++
    socket.emit('login', onlineUsers[uid])
  })

  socket.on('updateUserName', data => {
    console.log(data)
    const { uid, name } = data

    if (uid in onlineUsers) {
      onlineUsers[uid].username = name
      socket.emit('nameUpdated', onlineUsers[uid])
    } else {
      socket.emit('nameUpdated', {
        username: name,
        uid
      })
    }
  })

  socket.on('createRoom', data => {
    console.log(data)
    let roomId = generateRoomId()
    let socketRoom = 'room ' + (++count)
    let newRoom = {
      id: roomId,
      socketRoom,
      name: data.roomName,
      status: 0,
      type: data.roomType,
      master: {...data.master, clientId},
      players: [{...data.master, clientId}].map(p => ({
        ...p,
        status: 0,  // 表示玩家在房间内状态 0:准备中 1:游戏中 
      })),
      playTimers: 3,
      playersCount: 1
    }
    roomData[roomId] = newRoom

    socket.join(socketRoom, () => {
      console.log(`${roomData[roomId].master.username}进入房间${socketRoom}`)
    })

    io.emit('homeInfo', getHomeInfo())
    socket.emit('enterRoom', roomData[roomId])
  })

  socket.on('enterRoom', data => {
    console.log(data)
    const {
      roomId,
      socketRoom,
      player
    } = data
    let formalPlayers = roomData[roomId].players
    roomData[roomId].players = formalPlayers.concat({...player, clientId}).map(p => ({...p, status: 0}))
    roomData[roomId].playersCount ++
    // roomData[roomId].playTimers += 2

    socket.join(socketRoom, () => {
      console.log(`${player.username}进入房间${socketRoom}`)
    })

    // 更新房间信息
    socket.emit('updateRoomInfo', roomData[roomId])
    // 同步外部信息
    updateAllHomeInfo()
  })

  socket.on('leftRoom', data => {
    console.log(data)
    const {
      roomId,
      socketRoom,
      player
    } = data
    let formalPlayers = roomData[roomId].players
    // 房间没人了移除房间
    if (formalPlayers.length <= 1) {
      delete roomData[roomId]
    } else {
      roomData[roomId].players = formalPlayers.filter(item => item.uid !== player.uid)
      // 退的是房主则移交房主
      if (player.uid === roomData[roomId].master.uid) {
        roomData[roomId].master = roomData[roomId].players[0]
      }
    }

    socket.leave(socketRoom, () => {
      console.log(`${player.username}离开了房间${socketRoom}`)
    })

    updateAllHomeInfo()
  })

  socket.on('chatMessage', data => {
    const {msg, player} = data
    console.log(msg)
    console.log(socket.rooms)
    // 获取房间名
    let socketRoom = Object.keys(socket.rooms)[1]
    io.to(socketRoom).emit('chatMessage', data)
  })

  socket.on('startGame', data => {
    console.log(data)
    const { socketRoom, id, players } = data
    let gameKey = getNextKey()

    roomData[id].status = 1
    gameData[id] = {
      players,
      userScore: {},
      playInfo: {
        key: gameKey,
        painter: players[0],
        gameTime: 60
      }
    }

    players.forEach(p => {
      let gameInfo = {
        players,
        key: null,
        isPainter: false,
        gameTime: 60
      }
      if (p.clientId === gameData[id].playInfo.painter.clientId) {
        gameInfo.key = gameKey[0]
        gameInfo.isPainter = true
      } else {
        gameInfo.key = `${gameKey[0].length}个字 ${gameKey[1]}`
      }
      io.sockets.connected[p.clientId].emit('startGame', gameInfo)
    })

    updateAllHomeInfo()
  })

  socket.on('imageData', data => {
    console.log(data)
    console.log(socket.rooms)
    let socketRoom = Object.keys(socket.rooms)[1]

    socket.broadcast.to(socketRoom).emit('imageData', data)
  })

  socket.on('disconnect', () => {
    console.log('disconnect!')
    delete onlineUsers[clientId]
    console.log(onlineUsers)
    onlineCount--
    updateAllHomeInfo()
  })
}

io.on('connect', socket => {
  // console.log(io.sockets)
  handleConnect(socket, baseInfo)
})

server.listen(PORT, () => {
  console.log(`server start on ${PORT}`)
})